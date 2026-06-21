using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.InventoryAi;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class InventoryAiService(
    LiquorSaaSDbContext dbContext,
    ITenantProvider tenantProvider,
    ICurrentUserService currentUserService,
    HttpClient httpClient,
    IOptions<OpenAiInventoryOptions> options,
    ILogger<InventoryAiService> logger) : IInventoryAiService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly OpenAiInventoryOptions openAiOptions = options.Value;

    public async Task<InventoryAiAnalysisDto> AnalyzeAsync(AnalyzeInventoryImageRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        ValidateImageRequest(request);

        if (string.IsNullOrWhiteSpace(openAiOptions.ApiKey))
        {
            throw new AppValidationException("OpenAI is not configured for inventory analysis.");
        }

        var storeId = tenantProvider.GetRequiredStoreId();
        var catalog = await dbContext.Products.AsNoTracking()
            .Where(product => product.StoreId == storeId)
            .OrderBy(product => product.Name)
            .Select(product => new CatalogProductSnapshot(
                product.Id,
                product.Name,
                product.Category,
                product.Description,
                product.ImageUrl))
            .ToListAsync(cancellationToken);

        var aiResponse = await AnalyzeImageAsync(request, catalog, cancellationToken);
        var detectedItems = aiResponse.DetectedItems
            .Where(item => !string.IsNullOrWhiteSpace(item.RawLabel) && item.DetectedQuantity > 0)
            .Select(item => MapDetectedItem(item, catalog))
            .ToList();

        var scanId = Guid.NewGuid().ToString("N");
        return new InventoryAiAnalysisDto(
            scanId,
            detectedItems,
            new InventoryAiAnalysisSummaryDto(
                detectedItems.Count,
                detectedItems.Count(item => item.MatchStatus == "matched"),
                detectedItems.Count(item => item.MatchStatus == "needs_review"),
                detectedItems.Count(item => item.MatchStatus == "missing_from_catalog")));
    }

    public async Task<InventoryAiCommitResultDto> CommitAsync(CommitInventoryAiRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();

        if (string.IsNullOrWhiteSpace(request.ScanId))
        {
            throw new AppValidationException("ScanId is required.");
        }

        var storeId = tenantProvider.GetRequiredStoreId();
        var stockAdjustments = request.StockAdjustments ?? [];
        var newProducts = request.NewProducts ?? [];

        foreach (var adjustment in stockAdjustments)
        {
            if (adjustment.IncreaseBy <= 0)
            {
                throw new AppValidationException("Inventory adjustments must be greater than zero.");
            }
        }

        foreach (var newProduct in newProducts)
        {
            if (newProduct.Price <= 0)
            {
                throw new AppValidationException("New products created from AI require a price greater than zero.");
            }

            ValidateNewProduct(newProduct);
        }

        var adjustedIds = stockAdjustments.Select(item => item.ProductId).Distinct().ToArray();
        var productsToAdjust = await dbContext.Products
            .Where(product => product.StoreId == storeId && adjustedIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, cancellationToken);

        if (productsToAdjust.Count != adjustedIds.Length)
        {
            throw new AppValidationException("One or more selected products no longer exist in this store.");
        }

        var adjustedNames = new List<string>();
        var totalUnitsAdded = 0;
        var createdNames = new List<string>();
        var executionStrategy = dbContext.Database.CreateExecutionStrategy();

        try
        {
            await executionStrategy.ExecuteAsync(async () =>
            {
                await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

                foreach (var adjustment in stockAdjustments)
                {
                    var product = productsToAdjust[adjustment.ProductId];
                    var nextStock = product.Stock + adjustment.IncreaseBy;

                    product.Update(
                        product.Name,
                        product.Description,
                        product.Price,
                        nextStock,
                        product.Category,
                        product.ImageUrl,
                        product.IsActive);

                    adjustedNames.Add(product.Name);
                    totalUnitsAdded += adjustment.IncreaseBy;
                }

                foreach (var newProduct in newProducts)
                {
                    var entity = Product.Create(
                        storeId,
                        newProduct.Name,
                        newProduct.Description,
                        newProduct.Price,
                        newProduct.Stock,
                        newProduct.Category,
                        newProduct.ImageUrl);

                    if (!newProduct.IsActive)
                    {
                        entity.SetActiveStatus(false);
                    }

                    await dbContext.Products.AddAsync(entity, cancellationToken);
                    createdNames.Add(entity.Name);
                }

                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            });
        }
        catch (DbUpdateException exception)
        {
            logger.LogWarning(exception, "Inventory AI commit failed while saving changes for store {StoreId}", storeId);
            throw new AppValidationException(
                "No fue posible guardar los cambios del inventario.",
                exception.InnerException?.Message ?? exception.Message);
        }

        return new InventoryAiCommitResultDto(
            request.ScanId,
            adjustedNames.Count,
            createdNames.Count,
            totalUnitsAdded,
            adjustedNames,
            createdNames);
    }

    private async Task<OpenAiInventoryAnalysisResult> AnalyzeImageAsync(
        AnalyzeInventoryImageRequest request,
        IReadOnlyList<CatalogProductSnapshot> catalog,
        CancellationToken cancellationToken)
    {
        return IsKimiProvider()
            ? await AnalyzeImageWithKimiAsync(request, catalog, cancellationToken)
            : await AnalyzeImageWithOpenAiAsync(request, catalog, cancellationToken);
    }

    private async Task<OpenAiInventoryAnalysisResult> AnalyzeImageWithOpenAiAsync(
        AnalyzeInventoryImageRequest request,
        IReadOnlyList<CatalogProductSnapshot> catalog,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, openAiOptions.ResponsesEndpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", openAiOptions.ApiKey);

        var payload = BuildOpenAiPayload(request, catalog);
        httpRequest.Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json");

        using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("OpenAI inventory analysis failed with status {StatusCode}: {Body}", response.StatusCode, content);
            throw new AppValidationException(
                "No fue posible analizar la imagen con IA en este momento.",
                ExtractOpenAiError(content) ?? $"OpenAI HTTP {(int)response.StatusCode}");
        }

        using var document = JsonDocument.Parse(content);
        var outputText = ReadOutputText(document.RootElement);

        if (string.IsNullOrWhiteSpace(outputText))
        {
            throw new AppValidationException("La IA no devolvio un resultado util para esta imagen.");
        }

        var parsed = JsonSerializer.Deserialize<OpenAiInventoryAnalysisResult>(outputText, JsonOptions);
        if (parsed is null || parsed.DetectedItems.Count == 0)
        {
            throw new AppValidationException("No se encontraron productos validos en la imagen analizada.");
        }

        return parsed;
    }

    private async Task<OpenAiInventoryAnalysisResult> AnalyzeImageWithKimiAsync(
        AnalyzeInventoryImageRequest request,
        IReadOnlyList<CatalogProductSnapshot> catalog,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, openAiOptions.ChatCompletionsEndpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", openAiOptions.ApiKey);

        var payload = BuildKimiPayload(request, catalog);
        httpRequest.Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json");

        using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Kimi inventory analysis failed with status {StatusCode}: {Body}", response.StatusCode, content);
            throw new AppValidationException(
                "No fue posible analizar la imagen con IA en este momento.",
                ExtractOpenAiError(content) ?? $"Kimi HTTP {(int)response.StatusCode}");
        }

        using var document = JsonDocument.Parse(content);
        var outputText = ReadKimiOutputText(document.RootElement);

        if (string.IsNullOrWhiteSpace(outputText))
        {
            throw new AppValidationException("La IA no devolvio un resultado util para esta imagen.");
        }

        var parsed = JsonSerializer.Deserialize<OpenAiInventoryAnalysisResult>(outputText, JsonOptions);
        if (parsed is null || parsed.DetectedItems.Count == 0)
        {
            throw new AppValidationException("No se encontraron productos validos en la imagen analizada.");
        }

        return parsed;
    }

    private JsonObject BuildOpenAiPayload(AnalyzeInventoryImageRequest request, IReadOnlyList<CatalogProductSnapshot> catalog)
    {
        var catalogReference = catalog.Count == 0
            ? "No hay productos cargados en el catalogo actual."
            : string.Join('\n', catalog
                .Take(80)
                .Select(product => $"- {product.Name} | {product.Category}"));

        var instructions = """
You are analyzing a store inventory photo.
Return only the visible commercial products you can identify with reasonable confidence.
Be conservative with quantities.
Do not invent hidden products.
If the label is partially visible, provide the best short commercial label you can infer and lower confidence.
Suggested categories should be brief and in Spanish when possible.
Suggested descriptions should be short, factual, and nullable when not evident.
Keep all text fields concise.
""";

        var userPrompt = $"""
Analiza esta imagen para inventario de una tienda de bebidas.
Cuenta productos visibles y devuelve una sola entrada por producto detectado.

Catalogo actual de la tienda:
{catalogReference}
""";

        return new JsonObject
        {
            ["model"] = openAiOptions.Model,
            ["store"] = false,
            ["input"] = new JsonArray
            {
                new JsonObject
                {
                    ["role"] = "developer",
                    ["content"] = new JsonArray
                    {
                        new JsonObject
                        {
                            ["type"] = "input_text",
                            ["text"] = instructions
                        }
                    }
                },
                new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = new JsonArray
                    {
                        new JsonObject
                        {
                            ["type"] = "input_text",
                            ["text"] = userPrompt
                        },
                        new JsonObject
                        {
                            ["type"] = "input_image",
                            ["detail"] = "high",
                            ["image_url"] = $"data:{request.ContentType};base64,{Convert.ToBase64String(request.Content)}"
                        }
                    }
                }
            },
            ["text"] = new JsonObject
            {
                ["format"] = BuildJsonSchema()
            }
        };
    }

    private JsonObject BuildKimiPayload(AnalyzeInventoryImageRequest request, IReadOnlyList<CatalogProductSnapshot> catalog)
    {
        var catalogReference = catalog.Count == 0
            ? "No hay productos cargados en el catalogo actual."
            : string.Join('\n', catalog.Select(product => $"- {product.Name} | {product.Category}"));

        var systemInstructions = """
You are analyzing a store inventory photo.
Return only a JSON object that follows the requested schema.
Be conservative with quantities.
Do not invent hidden products.
If the label is partially visible, provide the best short commercial label you can infer and lower confidence.
Suggested categories should be brief and in Spanish when possible.
Suggested descriptions should be short, factual, and nullable when not evident.
Use the catalog reference to improve naming consistency, but still report products that are visible even if they are not in the catalog.
""";

        var userPrompt = $"""
Analiza esta imagen para inventario de una tienda de bebidas.
Cuenta productos visibles y devuelve una sola entrada por producto detectado.

Catalogo actual de la tienda:
{catalogReference}
""";

        return new JsonObject
        {
            ["model"] = openAiOptions.Model,
            ["messages"] = new JsonArray
            {
                new JsonObject
                {
                    ["role"] = "system",
                    ["content"] = systemInstructions
                },
                new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = new JsonArray
                    {
                        new JsonObject
                        {
                            ["type"] = "image_url",
                            ["image_url"] = new JsonObject
                            {
                                ["url"] = $"data:{request.ContentType};base64,{Convert.ToBase64String(request.Content)}"
                            }
                        },
                        new JsonObject
                        {
                            ["type"] = "text",
                            ["text"] = userPrompt
                        }
                    }
                }
            },
            ["max_completion_tokens"] = 1200,
            ["response_format"] = new JsonObject
            {
                ["type"] = "json_schema",
                ["json_schema"] = BuildKimiJsonSchema()
            }
        };
    }

    private static JsonObject BuildJsonSchema()
    {
        return new JsonObject
        {
            ["type"] = "json_schema",
            ["name"] = "inventory_scan",
            ["strict"] = true,
            ["schema"] = new JsonObject
            {
                ["type"] = "object",
                ["additionalProperties"] = false,
                ["required"] = new JsonArray("detectedItems"),
                ["properties"] = new JsonObject
                {
                    ["detectedItems"] = new JsonObject
                    {
                        ["type"] = "array",
                        ["items"] = new JsonObject
                        {
                            ["type"] = "object",
                            ["additionalProperties"] = false,
                            ["required"] = new JsonArray(
                                "rawLabel",
                                "detectedQuantity",
                                "confidence",
                                "suggestedCategory",
                                "suggestedDescription",
                                "suggestedImageUrl",
                                "notes"),
                            ["properties"] = new JsonObject
                            {
                                ["rawLabel"] = new JsonObject
                                {
                                    ["type"] = "string"
                                },
                                ["detectedQuantity"] = new JsonObject
                                {
                                    ["type"] = "integer",
                                    ["minimum"] = 1
                                },
                                ["confidence"] = new JsonObject
                                {
                                    ["type"] = "string",
                                    ["enum"] = new JsonArray("high", "medium", "low")
                                },
                                ["suggestedCategory"] = new JsonObject
                                {
                                    ["type"] = new JsonArray("string", "null")
                                },
                                ["suggestedDescription"] = new JsonObject
                                {
                                    ["type"] = new JsonArray("string", "null")
                                },
                                ["suggestedImageUrl"] = new JsonObject
                                {
                                    ["type"] = new JsonArray("string", "null")
                                },
                                ["notes"] = new JsonObject
                                {
                                    ["type"] = new JsonArray("string", "null")
                                }
                            }
                        }
                    }
                }
            }
        };
    }

    private static JsonObject BuildKimiJsonSchema()
    {
        return new JsonObject
        {
            ["name"] = "inventory_scan",
            ["schema"] = new JsonObject
            {
                ["type"] = "object",
                ["additionalProperties"] = false,
                ["required"] = new JsonArray("detectedItems"),
                ["properties"] = new JsonObject
                {
                    ["detectedItems"] = new JsonObject
                    {
                        ["type"] = "array",
                        ["items"] = new JsonObject
                        {
                            ["type"] = "object",
                            ["additionalProperties"] = false,
                            ["required"] = new JsonArray(
                                "rawLabel",
                                "detectedQuantity",
                                "confidence",
                                "suggestedCategory",
                                "suggestedDescription",
                                "suggestedImageUrl",
                                "notes"),
                            ["properties"] = new JsonObject
                            {
                                ["rawLabel"] = new JsonObject { ["type"] = "string" },
                                ["detectedQuantity"] = new JsonObject { ["type"] = "integer", ["minimum"] = 1 },
                                ["confidence"] = new JsonObject { ["type"] = "string", ["enum"] = new JsonArray("high", "medium", "low") },
                                ["suggestedCategory"] = new JsonObject { ["type"] = new JsonArray("string", "null") },
                                ["suggestedDescription"] = new JsonObject { ["type"] = new JsonArray("string", "null") },
                                ["suggestedImageUrl"] = new JsonObject { ["type"] = new JsonArray("string", "null") },
                                ["notes"] = new JsonObject { ["type"] = new JsonArray("string", "null") }
                            }
                        }
                    }
                }
            }
        };
    }

    private InventoryAiDetectedItemDto MapDetectedItem(OpenAiDetectedItem item, IReadOnlyList<CatalogProductSnapshot> catalog)
    {
        var normalizedLabel = Normalize(item.RawLabel);
        var bestCandidate = catalog
            .Select(product => new InventoryMatchCandidate(product, ComputeMatchScore(product, normalizedLabel, item.SuggestedCategory)))
            .OrderByDescending(candidate => candidate.Score)
            .FirstOrDefault();

        var status = "missing_from_catalog";
        Guid? matchedProductId = null;
        string? matchedProductName = null;
        var notes = item.Notes;

        if (bestCandidate is not null && bestCandidate.Score >= 0.86d)
        {
            status = "matched";
            matchedProductId = bestCandidate.Product.Id;
            matchedProductName = bestCandidate.Product.Name;
        }
        else if (bestCandidate is not null && bestCandidate.Score >= 0.58d)
        {
            status = "needs_review";
            matchedProductId = bestCandidate.Product.Id;
            matchedProductName = bestCandidate.Product.Name;
            notes = string.IsNullOrWhiteSpace(notes)
                ? $"Coincidencia sugerida: {bestCandidate.Product.Name}"
                : notes;
        }

        return new InventoryAiDetectedItemDto(
            item.RawLabel.Trim(),
            item.DetectedQuantity,
            item.Confidence,
            status,
            matchedProductId,
            matchedProductName,
            CleanNullable(item.SuggestedCategory),
            CleanNullable(item.SuggestedDescription),
            CleanNullable(item.SuggestedImageUrl),
            CleanNullable(notes));
    }

    private static double ComputeMatchScore(CatalogProductSnapshot product, string normalizedLabel, string? suggestedCategory)
    {
        var normalizedProductName = Normalize(product.Name);
        if (normalizedProductName == normalizedLabel)
        {
            return 1d;
        }

        var containmentScore = normalizedProductName.Contains(normalizedLabel, StringComparison.Ordinal)
            || normalizedLabel.Contains(normalizedProductName, StringComparison.Ordinal)
            ? 0.9d
            : 0d;

        var tokenScore = ComputeTokenOverlap(normalizedProductName, normalizedLabel);
        var editScore = ComputeLevenshteinSimilarity(normalizedProductName, normalizedLabel);
        var categoryBonus = !string.IsNullOrWhiteSpace(suggestedCategory)
            && Normalize(product.Category) == Normalize(suggestedCategory)
            ? 0.08d
            : 0d;

        return Math.Max(containmentScore, (tokenScore * 0.55d) + (editScore * 0.35d) + categoryBonus);
    }

    private static double ComputeTokenOverlap(string left, string right)
    {
        var leftTokens = left.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.Ordinal);
        var rightTokens = right.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.Ordinal);

        if (leftTokens.Count == 0 || rightTokens.Count == 0)
        {
            return 0d;
        }

        var intersection = leftTokens.Intersect(rightTokens, StringComparer.Ordinal).Count();
        var union = leftTokens.Union(rightTokens, StringComparer.Ordinal).Count();
        return union == 0 ? 0d : (double)intersection / union;
    }

    private static double ComputeLevenshteinSimilarity(string left, string right)
    {
        if (string.IsNullOrEmpty(left) || string.IsNullOrEmpty(right))
        {
            return 0d;
        }

        var distance = ComputeLevenshteinDistance(left, right);
        var maxLength = Math.Max(left.Length, right.Length);
        return maxLength == 0 ? 1d : 1d - ((double)distance / maxLength);
    }

    private static int ComputeLevenshteinDistance(string left, string right)
    {
        var matrix = new int[left.Length + 1, right.Length + 1];

        for (var i = 0; i <= left.Length; i++)
        {
            matrix[i, 0] = i;
        }

        for (var j = 0; j <= right.Length; j++)
        {
            matrix[0, j] = j;
        }

        for (var i = 1; i <= left.Length; i++)
        {
            for (var j = 1; j <= right.Length; j++)
            {
                var cost = left[i - 1] == right[j - 1] ? 0 : 1;
                matrix[i, j] = Math.Min(
                    Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                    matrix[i - 1, j - 1] + cost);
            }
        }

        return matrix[left.Length, right.Length];
    }

    private static string Normalize(string value)
    {
        var decomposed = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);

        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(char.IsLetterOrDigit(character) ? char.ToLowerInvariant(character) : ' ');
        }

        return string.Join(' ', builder.ToString()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static string? ReadOutputText(JsonElement root)
    {
        if (root.TryGetProperty("output_text", out var outputTextElement) && outputTextElement.ValueKind == JsonValueKind.String)
        {
            return outputTextElement.GetString();
        }

        if (!root.TryGetProperty("output", out var outputElement) || outputElement.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var message in outputElement.EnumerateArray())
        {
            if (!message.TryGetProperty("content", out var contentElement) || contentElement.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var content in contentElement.EnumerateArray())
            {
                if (content.TryGetProperty("text", out var textElement) && textElement.ValueKind == JsonValueKind.String)
                {
                    return textElement.GetString();
                }
            }
        }

        return null;
    }

    private static string? ReadKimiOutputText(JsonElement root)
    {
        if (!root.TryGetProperty("choices", out var choicesElement) || choicesElement.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var choice in choicesElement.EnumerateArray())
        {
            if (!choice.TryGetProperty("message", out var messageElement))
            {
                continue;
            }

            if (messageElement.TryGetProperty("content", out var contentElement) && contentElement.ValueKind == JsonValueKind.String)
            {
                return contentElement.GetString();
            }
        }

        return null;
    }

    private static string? CleanNullable(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? ExtractOpenAiError(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(content);
            if (document.RootElement.TryGetProperty("error", out var errorElement))
            {
                if (errorElement.TryGetProperty("message", out var messageElement) && messageElement.ValueKind == JsonValueKind.String)
                {
                    return messageElement.GetString();
                }

                return errorElement.ToString();
            }
        }
        catch (JsonException)
        {
            return content;
        }

        return content;
    }

    private bool IsKimiProvider() =>
        string.Equals(openAiOptions.Provider, "Kimi", StringComparison.OrdinalIgnoreCase)
        || string.Equals(openAiOptions.Provider, "Moonshot", StringComparison.OrdinalIgnoreCase);

    private static void ValidateImageRequest(AnalyzeInventoryImageRequest request)
    {
        if (request.Content.Length == 0)
        {
            throw new AppValidationException("Selecciona una imagen para analizar.");
        }

        if (!request.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            throw new AppValidationException("El archivo seleccionado no es una imagen valida.");
        }

        if (request.Content.Length > 10 * 1024 * 1024)
        {
            throw new AppValidationException("La imagen supera el limite de 10 MB.");
        }
    }

    private static void ValidateNewProduct(InventoryAiNewProductRequest newProduct)
    {
        if (string.IsNullOrWhiteSpace(newProduct.Name))
        {
            throw new AppValidationException("El nombre del producto nuevo es obligatorio.");
        }

        if (newProduct.Name.Trim().Length > 160)
        {
            throw new AppValidationException("El nombre del producto nuevo no puede superar 160 caracteres.");
        }

        if (string.IsNullOrWhiteSpace(newProduct.Description))
        {
            throw new AppValidationException("La descripcion del producto nuevo es obligatoria.");
        }

        if (newProduct.Description.Trim().Length > 1000)
        {
            throw new AppValidationException("La descripcion del producto nuevo no puede superar 1000 caracteres.");
        }

        if (string.IsNullOrWhiteSpace(newProduct.Category))
        {
            throw new AppValidationException("La categoria del producto nuevo es obligatoria.");
        }

        if (newProduct.Category.Trim().Length > 120)
        {
            throw new AppValidationException("La categoria del producto nuevo no puede superar 120 caracteres.");
        }

        if (!string.IsNullOrWhiteSpace(newProduct.ImageUrl) && newProduct.ImageUrl.Trim().Length > 500)
        {
            throw new AppValidationException("La URL de imagen no puede superar 500 caracteres.");
        }

        if (newProduct.Stock < 0)
        {
            throw new AppValidationException("El stock del producto nuevo no puede ser negativo.");
        }
    }

    private void EnsureStoreAdminOrSuperAdmin()
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Store admin or super admin role is required.");
        }
    }

    private sealed record CatalogProductSnapshot(
        Guid Id,
        string Name,
        string Category,
        string Description,
        string? ImageUrl);

    private sealed record InventoryMatchCandidate(CatalogProductSnapshot Product, double Score);

    private sealed record OpenAiInventoryAnalysisResult(IReadOnlyList<OpenAiDetectedItem> DetectedItems)
    {
        public OpenAiInventoryAnalysisResult() : this([])
        {
        }
    }

    private sealed record OpenAiDetectedItem(
        string RawLabel,
        int DetectedQuantity,
        string Confidence,
        string? SuggestedCategory,
        string? SuggestedDescription,
        string? SuggestedImageUrl,
        string? Notes);
}
