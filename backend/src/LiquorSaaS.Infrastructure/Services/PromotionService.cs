using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Promotions;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class PromotionService(LiquorSaaSDbContext dbContext) : IPromotionService
{
    public async Task<PromotionValidationDto> ValidateAsync(ValidatePromotionRequest request, CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
        {
            throw new AppValidationException("At least one item is required to validate a promotion.");
        }

        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToArray();
        var products = await dbContext.Products.AsNoTracking()
            .Where(x => x.StoreId == request.StoreId && x.IsActive && productIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (products.Count != productIds.Length)
        {
            throw new AppValidationException("One or more products do not exist for this store.");
        }

        var cartItems = request.Items.Select(item =>
        {
            var product = products.Single(x => x.Id == item.ProductId);
            if (item.Quantity <= 0)
            {
                throw new AppValidationException("Quantity must be greater than zero.");
            }

            return new PromotionCartItemRequest(product.Id, product.Price, item.Quantity);
        }).ToArray();

        return await EvaluateRequiredAsync(request.StoreId, request.Code, cartItems, cancellationToken);
    }

    public async Task<PromotionValidationDto?> EvaluateAsync(
        Guid storeId,
        string? code,
        IReadOnlyCollection<PromotionCartItemRequest> items,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        return await EvaluateRequiredAsync(storeId, code, items, cancellationToken);
    }

    private async Task<PromotionValidationDto> EvaluateRequiredAsync(
        Guid storeId,
        string code,
        IReadOnlyCollection<PromotionCartItemRequest> items,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            throw new AppValidationException("At least one item is required to validate a promotion.");
        }

        var normalizedCode = Promotion.NormalizeCode(code);
        var utcNow = DateTime.UtcNow;

        var promotion = await dbContext.Promotions.AsNoTracking()
            .SingleOrDefaultAsync(x => x.StoreId == storeId && x.Code == normalizedCode, cancellationToken)
            ?? throw new NotFoundException("Promotion code not found.");

        if (!promotion.IsActiveAt(utcNow))
        {
            throw new ConflictException("Promotion code is no longer active.");
        }

        var subtotal = items.Sum(x => x.UnitPrice * x.Quantity);
        var discountTotal = promotion.Type switch
        {
            PromotionType.Percentage => RoundMoney(subtotal * (promotion.PercentageValue ?? 0m) / 100m),
            PromotionType.BuyXGetY => CalculateBuyXGetYDiscount(items, promotion),
            _ => 0m
        };

        if (discountTotal <= 0)
        {
            throw new ConflictException("Promotion code does not apply to the current cart.");
        }

        var total = subtotal - discountTotal;

        return new PromotionValidationDto(
            promotion.Id,
            promotion.Name,
            promotion.Code,
            promotion.Type,
            subtotal,
            discountTotal,
            total,
            BuildSummary(promotion, discountTotal));
    }

    private static decimal CalculateBuyXGetYDiscount(IReadOnlyCollection<PromotionCartItemRequest> items, Promotion promotion)
    {
        var buyQuantity = promotion.BuyQuantity ?? 0;
        var freeQuantity = promotion.FreeQuantity ?? 0;
        var cycle = buyQuantity + freeQuantity;
        if (cycle <= 0)
        {
            return 0m;
        }

        var targetProductId = promotion.TargetProductId;
        if (!targetProductId.HasValue)
        {
            return 0m;
        }

        var item = items.SingleOrDefault(x => x.ProductId == targetProductId.Value);
        if (item is null)
        {
            return 0m;
        }

        var groups = item.Quantity / cycle;
        var freeUnits = groups * freeQuantity;
        var total = freeUnits > 0 ? item.UnitPrice * freeUnits : 0m;

        return RoundMoney(total);
    }

    private static string BuildSummary(Promotion promotion, decimal discountTotal) =>
        promotion.Type == PromotionType.Percentage
            ? $"{promotion.PercentageValue:0.##}% aplicado"
            : $"2x1 aplicado por ${discountTotal:0.##}";

    private static decimal RoundMoney(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
