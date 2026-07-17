using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Application.Orders;
using LiquorSaaS.Application.Products;
using LiquorSaaS.Application.Promotions;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.Domain.Entities;

namespace LiquorSaaS.Infrastructure.Mapping;

internal static class DtoMappings
{
    public static BannerDto ToDto(this Banner entity) =>
        new(
            entity.BannerId,
            entity.StoreId,
            entity.Header,
            entity.Title,
            entity.Description,
            entity.Wildcard,
            entity.ExpirationDate,
            entity.Status,
            entity.Created,
            entity.Promotion?.ToSummaryDto());

    public static PromotionSummaryDto ToSummaryDto(this Promotion entity) =>
        new(
            entity.Id,
            entity.Name,
            entity.Code,
            entity.Type,
            entity.PercentageValue,
            entity.BuyQuantity,
            entity.FreeQuantity,
            entity.TargetProductId,
            entity.TargetProduct?.Name,
            entity.Status,
            entity.ExpirationDate);

    public static StoreDto ToDto(this Store entity) =>
        new(
            entity.Id,
            entity.Name,
            entity.Slug,
            entity.WelcomePhrase,
            entity.OpeningTime,
            entity.ClosingTime,
            entity.CartonPrice,
            entity.BucketPrice,
            entity.MinimumPurchase,
            entity.BusinessAddress,
            entity.Latitude,
            entity.Longitude,
            entity.IsActive,
            entity.SubscriptionStatus,
            entity.CreatedAtUtc);

    public static ProductDto ToDto(this Product entity) =>
        new(
            entity.Id,
            entity.StoreId,
            entity.Name,
            entity.Description,
            entity.Price,
            entity.Stock,
            entity.Category,
            entity.StoreCategoryId,
            entity.ImageUrl,
            entity.IsActive,
            entity.DepositType,
            entity.CreatedAtUtc,
            entity.UpdatedAtUtc);

    public static OrderDto ToDto(this Order entity) =>
        entity.ToDto(null);

    public static OrderDto ToDto(this Order entity, DeliveryUser? deliveryAssignee) =>
        new(
            entity.Id,
            entity.StoreId,
            entity.CustomerName,
            entity.CustomerPhone,
            entity.DeliveryAddress,
            entity.DeliveryLatitude,
            entity.DeliveryLongitude,
            entity.Notes,
            entity.Status,
            entity.DeliveryUserId,
            entity.Subtotal,
            entity.DiscountTotal,
            entity.DepositTotal,
            entity.AppliedPromotionId,
            entity.AppliedPromotionCode,
            entity.Total,
            entity.CreatedAtUtc,
            entity.UpdatedAtUtc,
            entity.Items.Select(item => new OrderItemDto(
                item.Id,
                item.ProductId,
                item.ProductNameSnapshot,
                item.Product?.ImageUrl,
                item.UnitPrice,
                item.Quantity,
                item.Subtotal,
                item.EmptyContainersToExchange)).ToArray(),
            entity.Deposits.Select(deposit => new OrderDepositDto(
                deposit.Id,
                deposit.ProductId,
                deposit.ProductNameSnapshot,
                deposit.Type,
                deposit.Quantity,
                deposit.UnitPrice,
                deposit.Total)).ToArray(),
            deliveryAssignee is null
                ? null
                : new OrderDeliveryAssigneeDto(
                    deliveryAssignee.Id,
                    deliveryAssignee.FullName,
                    deliveryAssignee.Phone,
                    deliveryAssignee.Email,
                    deliveryAssignee.IsActive,
                    (int)deliveryAssignee.CurrentAvailability));

    public static DeliveryUserDto ToDto(this DeliveryUser entity, string? storeName = null) =>
        new(
            entity.Id,
            entity.UserId,
            entity.StoreId,
            storeName,
            entity.FullName,
            entity.Phone,
            entity.Email,
            entity.IsActive,
            entity.CurrentAvailability);
}
