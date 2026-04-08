namespace LiquorSaaS.Application.Admin;

public sealed record DashboardDto(
    int TotalProducts,
    int ActiveProducts,
    int TotalOrders,
    int PendingOrders,
    int ReadyOrders,
    int OnTheWayOrders,
    decimal RevenueInOrders);

public interface IAdminService
{
    Task<DashboardDto> GetDashboardAsync(CancellationToken cancellationToken);
}
