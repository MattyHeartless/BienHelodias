using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Application.Promotions;

public sealed record PromotionConfigurationRequest(
    string? Name,
    string? Code,
    PromotionType Type,
    decimal? PercentageValue,
    int? BuyQuantity,
    int? FreeQuantity,
    Guid? TargetProductId);

public sealed record PromotionSummaryDto(
    Guid PromotionId,
    string Name,
    string Code,
    PromotionType Type,
    decimal? PercentageValue,
    int? BuyQuantity,
    int? FreeQuantity,
    Guid? TargetProductId,
    string? TargetProductName,
    bool Status,
    DateTime? ExpirationDate);

public sealed record PromotionCartItemRequest(
    Guid ProductId,
    decimal UnitPrice,
    int Quantity);

public sealed record ValidatePromotionItemRequest(
    Guid ProductId,
    int Quantity);

public sealed record ValidatePromotionRequest(
    Guid StoreId,
    string Code,
    IReadOnlyCollection<ValidatePromotionItemRequest> Items);

public sealed record PromotionValidationDto(
    Guid PromotionId,
    string Name,
    string Code,
    PromotionType Type,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal Total,
    string Summary);

public interface IPromotionService
{
    Task<PromotionValidationDto> ValidateAsync(ValidatePromotionRequest request, CancellationToken cancellationToken);
    Task<PromotionValidationDto?> EvaluateAsync(Guid storeId, string? code, IReadOnlyCollection<PromotionCartItemRequest> items, CancellationToken cancellationToken);
}
