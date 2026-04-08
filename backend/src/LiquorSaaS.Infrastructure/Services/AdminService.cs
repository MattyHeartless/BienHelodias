using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class AdminService(
    LiquorSaaSDbContext dbContext,
    ITenantProvider tenantProvider,
    ICurrentUserService currentUserService) : IAdminService
{
    public async Task<DashboardDto> GetDashboardAsync(CancellationToken cancellationToken)
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Store admin or super admin role is required.");
        }

        var storeId = tenantProvider.GetRequiredStoreId();
        var orders = dbContext.Orders.AsNoTracking().Where(x => x.StoreId == storeId);
        var products = dbContext.Products.AsNoTracking().Where(x => x.StoreId == storeId);

        return new DashboardDto(
            await products.CountAsync(cancellationToken),
            await products.CountAsync(x => x.IsActive, cancellationToken),
            await orders.CountAsync(cancellationToken),
            await orders.CountAsync(x => x.Status == OrderStatus.Pending, cancellationToken),
            await orders.CountAsync(x => x.Status == OrderStatus.Ready, cancellationToken),
            await orders.CountAsync(x => x.Status == OrderStatus.OnTheWay, cancellationToken),
            await orders.Where(x => x.Status != OrderStatus.Cancelled).Select(x => (decimal?)x.Total).SumAsync(cancellationToken) ?? 0m);
    }
}
