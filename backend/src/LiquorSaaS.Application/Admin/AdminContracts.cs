using LiquorSaaS.Application.Delivery;

namespace LiquorSaaS.Application.Admin;

public sealed record DashboardDto(
    int TotalProducts,
    int ActiveProducts,
    int TotalOrders,
    int PendingOrders,
    int ReadyOrders,
    int OnTheWayOrders,
    decimal RevenueInOrders);

public sealed record StoreAdminDto(
    Guid Id,
    Guid StoreId,
    string Name,
    string Email,
    bool IsActive,
    DateTime CreatedAtUtc);

public sealed record UpdateDeliveryUserStatusRequest(bool IsActive);

public interface IAdminService
{
    Task<DashboardDto> GetDashboardAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<StoreAdminDto>> GetStoreAdminsAsync(Guid storeId, CancellationToken cancellationToken);
    Task<IReadOnlyList<DeliveryUserDto>> GetDeliveryUsersAsync(CancellationToken cancellationToken);
    Task<DeliveryUserDto> UpdateDeliveryUserStatusAsync(Guid deliveryUserId, UpdateDeliveryUserStatusRequest request, CancellationToken cancellationToken);
}
