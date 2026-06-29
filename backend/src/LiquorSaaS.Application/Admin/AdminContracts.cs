using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Application.Admin;

public sealed record DashboardDto(
    int TotalProducts,
    int ActiveProducts,
    int TotalOrders,
    int PendingOrders,
    int ReadyOrders,
    int OnTheWayOrders,
    decimal RevenueInOrders);

public sealed record DashboardPeriodDto(DateTime From, DateTime To);

public sealed record DashboardKpisDto(
    int TotalOrders,
    decimal Revenue,
    decimal AverageTicket,
    int PendingOrders,
    int ReadyOrders,
    int OnTheWayOrders,
    int DeliveredOrders,
    int CancelledOrders,
    int TotalProducts,
    int ActiveProducts,
    int LowStockProducts,
    int OutOfStockProducts,
    decimal InventoryValue);

public sealed record RevenuePointDto(
    DateTime Date,
    int Orders,
    decimal Revenue,
    decimal AverageTicket);

public sealed record OrderStatusMetricDto(
    OrderStatus Status,
    string Label,
    int Count,
    decimal Percentage,
    decimal Revenue);

public sealed record InventoryHealthDto(
    int ActiveProducts,
    int InactiveProducts,
    int LowStockProducts,
    int OutOfStockProducts,
    int HealthyProducts,
    int LowStockThreshold);

public sealed record CategoryStockDto(
    string Category,
    int Products,
    int Units,
    decimal InventoryValue,
    int LowStockProducts);

public sealed record TopSellingProductDto(
    Guid ProductId,
    string Name,
    string Category,
    int UnitsSold,
    decimal Revenue,
    string? ImageUrl);

public sealed record StockAlertProductDto(
    Guid ProductId,
    string Name,
    string Category,
    int Stock,
    decimal Price,
    string? ImageUrl,
    string Severity);

public sealed record RecentOrderDto(
    Guid Id,
    string CustomerName,
    OrderStatus Status,
    decimal Total,
    int ItemCount,
    DateTime CreatedAtUtc);

public sealed record DashboardOverviewDto(
    DashboardPeriodDto Period,
    DashboardKpisDto Kpis,
    IReadOnlyList<RevenuePointDto> RevenueByDay,
    IReadOnlyList<OrderStatusMetricDto> OrdersByStatus,
    InventoryHealthDto InventoryHealth,
    IReadOnlyList<CategoryStockDto> StockByCategory,
    IReadOnlyList<TopSellingProductDto> TopSellingProducts,
    IReadOnlyList<StockAlertProductDto> StockAlerts,
    IReadOnlyList<RecentOrderDto> RecentOrders);

public sealed record SuperAdminDashboardKpisDto(
    int TotalStores,
    int ActiveStores,
    int InactiveStores,
    int TrialStores,
    int ActiveSubscriptions,
    int SuspendedStores,
    int CancelledStores,
    int StoresWithOrders,
    int TotalOrders,
    decimal Revenue,
    decimal AverageTicket,
    int TotalProducts,
    int ActiveProducts,
    int LowStockProducts,
    int OutOfStockProducts,
    decimal InventoryValue);

public sealed record SubscriptionStatusMetricDto(
    SubscriptionStatus Status,
    string Label,
    int Count,
    decimal Percentage);

public sealed record TopStoreMetricDto(
    Guid StoreId,
    string Name,
    string Slug,
    int Orders,
    decimal Revenue,
    decimal AverageTicket);

public sealed record StoreOperationalHealthDto(
    Guid StoreId,
    string Name,
    string Slug,
    bool IsActive,
    SubscriptionStatus SubscriptionStatus,
    int LowStockProducts,
    int OutOfStockProducts,
    int PendingOrders,
    int OnTheWayOrders,
    DateTime? LastOrderAtUtc);

public sealed record RecentStoreDto(
    Guid StoreId,
    string Name,
    string Slug,
    bool IsActive,
    SubscriptionStatus SubscriptionStatus,
    DateTime CreatedAtUtc);

public sealed record SuperAdminRecentOrderDto(
    Guid Id,
    Guid StoreId,
    string StoreName,
    string CustomerName,
    OrderStatus Status,
    decimal Total,
    int ItemCount,
    DateTime CreatedAtUtc);

public sealed record SuperAdminDashboardOverviewDto(
    DashboardPeriodDto Period,
    SuperAdminDashboardKpisDto Kpis,
    IReadOnlyList<RevenuePointDto> RevenueByDay,
    IReadOnlyList<OrderStatusMetricDto> OrdersByStatus,
    IReadOnlyList<SubscriptionStatusMetricDto> StoresBySubscription,
    IReadOnlyList<TopStoreMetricDto> TopStoresByRevenue,
    IReadOnlyList<TopStoreMetricDto> TopStoresByOrders,
    IReadOnlyList<StoreOperationalHealthDto> StoreOperationalHealth,
    IReadOnlyList<RecentStoreDto> RecentStores,
    IReadOnlyList<SuperAdminRecentOrderDto> RecentOrders);

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
    Task<DashboardOverviewDto> GetDashboardOverviewAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken);
    Task<SuperAdminDashboardOverviewDto> GetSuperAdminDashboardOverviewAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken);
    Task<IReadOnlyList<StoreAdminDto>> GetStoreAdminsAsync(Guid storeId, CancellationToken cancellationToken);
    Task<IReadOnlyList<DeliveryUserDto>> GetDeliveryUsersAsync(CancellationToken cancellationToken);
    Task<DeliveryUserDto> UpdateDeliveryUserStatusAsync(Guid deliveryUserId, UpdateDeliveryUserStatusRequest request, CancellationToken cancellationToken);
}
