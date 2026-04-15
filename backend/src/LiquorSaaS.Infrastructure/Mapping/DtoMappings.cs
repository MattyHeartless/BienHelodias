using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Application.Orders;
using LiquorSaaS.Application.Products;
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
            entity.Created);

    public static StoreDto ToDto(this Store entity) =>
        new(entity.Id, entity.Name, entity.Slug, entity.WelcomePhrase, entity.IsActive, entity.SubscriptionStatus, entity.CreatedAtUtc);

    public static ProductDto ToDto(this Product entity) =>
        new(
            entity.Id,
            entity.StoreId,
            entity.Name,
            entity.Description,
            entity.Price,
            entity.Stock,
            entity.Category,
            entity.ImageUrl,
            entity.IsActive,
            entity.CreatedAtUtc,
            entity.UpdatedAtUtc);

    public static OrderDto ToDto(this Order entity) =>
        new(
            entity.Id,
            entity.StoreId,
            entity.CustomerName,
            entity.CustomerPhone,
            entity.DeliveryAddress,
            entity.Notes,
            entity.Status,
            entity.DeliveryUserId,
            entity.Total,
            entity.CreatedAtUtc,
            entity.UpdatedAtUtc,
            entity.Items.Select(item => new OrderItemDto(
                item.Id,
                item.ProductId,
                item.ProductNameSnapshot,
                item.UnitPrice,
                item.Quantity,
                item.Subtotal)).ToArray());

    public static DeliveryUserDto ToDto(this DeliveryUser entity) =>
        new(
            entity.Id,
            entity.UserId,
            entity.StoreId,
            entity.FullName,
            entity.Phone,
            entity.Email,
            entity.IsActive,
            entity.CurrentAvailability);
}
