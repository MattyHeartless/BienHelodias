namespace LiquorSaaS.Application.InventoryAi;

public sealed record AnalyzeInventoryImageRequest(
    string FileName,
    string ContentType,
    byte[] Content);

public sealed record InventoryAiAnalysisDto(
    string ScanId,
    IReadOnlyList<InventoryAiDetectedItemDto> DetectedItems,
    InventoryAiAnalysisSummaryDto Summary);

public sealed record InventoryAiDetectedItemDto(
    string RawLabel,
    int DetectedQuantity,
    string Confidence,
    string MatchStatus,
    Guid? MatchedProductId,
    string? MatchedProductName,
    string? SuggestedCategory,
    string? SuggestedDescription,
    string? SuggestedImageUrl,
    string? Notes);

public sealed record InventoryAiAnalysisSummaryDto(
    int TotalDetections,
    int MatchedCount,
    int NeedsReviewCount,
    int MissingCount);

public sealed record CommitInventoryAiRequest(
    string ScanId,
    IReadOnlyList<InventoryAiStockAdjustmentRequest> StockAdjustments,
    IReadOnlyList<InventoryAiNewProductRequest> NewProducts);

public sealed record InventoryAiStockAdjustmentRequest(
    Guid ProductId,
    int IncreaseBy,
    string SourceLabel);

public sealed record InventoryAiNewProductRequest(
    string Name,
    string Description,
    decimal Price,
    int Stock,
    string Category,
    string? ImageUrl,
    bool IsActive,
    string SourceLabel);

public sealed record InventoryAiCommitResultDto(
    string ScanId,
    int AdjustedProductsCount,
    int CreatedProductsCount,
    int TotalUnitsAdded,
    IReadOnlyList<string> AdjustedProductNames,
    IReadOnlyList<string> CreatedProductNames);

public interface IInventoryAiService
{
    Task<InventoryAiAnalysisDto> AnalyzeAsync(AnalyzeInventoryImageRequest request, CancellationToken cancellationToken);
    Task<InventoryAiCommitResultDto> CommitAsync(CommitInventoryAiRequest request, CancellationToken cancellationToken);
}
