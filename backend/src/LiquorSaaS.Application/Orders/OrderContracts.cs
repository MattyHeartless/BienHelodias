using LiquorSaaS.Application.Common;
using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Application.Orders;

public sealed record CreateOrderItemRequest(Guid ProductId, int Quantity, int EmptyContainersToExchange = 0);

public sealed record CreateOrderRequest(
    Guid StoreId,
    string CustomerName,
    string CustomerPhone,
    string DeliveryAddress,
    decimal? DeliveryLatitude,
    decimal? DeliveryLongitude,
    string? Notes,
    IReadOnlyCollection<CreateOrderItemRequest> Items,
    string? PromoCode = null);

public sealed record UpdateOrderStatusRequest(OrderStatus Status);

public sealed record OrderItemDto(Guid Id, Guid ProductId, string ProductNameSnapshot, string? ImageUrl, decimal UnitPrice, int Quantity, decimal Subtotal, int EmptyContainersToExchange);

public sealed record OrderDepositDto(Guid Id, Guid ProductId, string ProductNameSnapshot, ContainerDepositType Type, int Quantity, decimal UnitPrice, decimal Total);

public sealed record OrderDeliveryAssigneeDto(
    Guid Id,
    string FullName,
    string Phone,
    string Email,
    bool IsActive,
    int CurrentAvailability);

public sealed record OrderDto(
    Guid Id,
    Guid StoreId,
    string CustomerName,
    string CustomerPhone,
    string DeliveryAddress,
    decimal? DeliveryLatitude,
    decimal? DeliveryLongitude,
    string? Notes,
    OrderStatus Status,
    Guid? DeliveryUserId,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal DepositTotal,
    Guid? AppliedPromotionId,
    string? AppliedPromotionCode,
    decimal Total,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<OrderItemDto> Items,
    IReadOnlyCollection<OrderDepositDto> Deposits,
    OrderDeliveryAssigneeDto? DeliveryAssignee = null);

public interface IOrderService
{
    Task<OrderDto> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken);
    Task<OrderDto> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<OrderDto> GetTrackingByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<PagedResult<OrderDto>> GetStoreOrdersAsync(PaginationRequest request, OrderStatus? status, string? search, CancellationToken cancellationToken);
    Task<OrderDto> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request, CancellationToken cancellationToken);
    Task<OrderDto> TakeAsync(Guid id, CancellationToken cancellationToken);
    Task<OrderDto> ReleaseAsync(Guid id, CancellationToken cancellationToken);
}
