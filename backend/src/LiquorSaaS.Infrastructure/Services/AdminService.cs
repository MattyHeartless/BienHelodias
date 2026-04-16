using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Mapping;
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

    public async Task<IReadOnlyList<StoreAdminDto>> GetStoreAdminsAsync(Guid storeId, CancellationToken cancellationToken)
    {
        if (currentUserService.Role != UserRole.SuperAdmin)
        {
            throw new ForbiddenException("Super admin role is required.");
        }

        var storeExists = await dbContext.Stores
            .AsNoTracking()
            .AnyAsync(x => x.Id == storeId, cancellationToken);

        if (!storeExists)
        {
            throw new NotFoundException("Store not found.");
        }

        return await dbContext.Users
            .AsNoTracking()
            .Where(x => x.StoreId == storeId && x.Role == UserRole.StoreAdmin)
            .OrderBy(x => x.Name)
            .Select(x => new StoreAdminDto(
                x.Id,
                x.StoreId!.Value,
                x.Name,
                x.Email,
                x.IsActive,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DeliveryUserDto>> GetDeliveryUsersAsync(CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();

        var storeId = tenantProvider.GetRequiredStoreId();
        return await dbContext.DeliveryUsers
            .AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderBy(x => x.FullName)
            .Select(x => x.ToDto())
            .ToListAsync(cancellationToken);
    }

    public async Task<DeliveryUserDto> UpdateDeliveryUserStatusAsync(Guid deliveryUserId, UpdateDeliveryUserStatusRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();

        var storeId = tenantProvider.GetRequiredStoreId();
        var deliveryUser = await dbContext.DeliveryUsers
            .SingleOrDefaultAsync(x => x.Id == deliveryUserId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Delivery user not found.");

        var appUser = await dbContext.Users
            .SingleOrDefaultAsync(x => x.Id == deliveryUser.UserId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("App user for delivery profile was not found.");

        deliveryUser.SetActive(request.IsActive);
        appUser.Update(appUser.Name, request.IsActive);

        if (!request.IsActive)
        {
            deliveryUser.UpdateAvailability(DeliveryAvailability.Unavailable);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return deliveryUser.ToDto();
    }

    private void EnsureStoreAdminOrSuperAdmin()
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Store admin or super admin role is required.");
        }
    }
}
