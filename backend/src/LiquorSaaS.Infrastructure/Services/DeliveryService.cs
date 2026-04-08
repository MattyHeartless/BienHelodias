using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Extensions;
using LiquorSaaS.Infrastructure.Mapping;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class DeliveryService(
    LiquorSaaSDbContext dbContext,
    ITenantProvider tenantProvider,
    ICurrentUserService currentUserService) : IDeliveryService
{
    public async Task<PagedResult<Application.Orders.OrderDto>> GetAvailableOrdersAsync(PaginationRequest request, CancellationToken cancellationToken)
    {
        EnsureDeliveryUser();
        var storeId = tenantProvider.GetRequiredStoreId();

        return await dbContext.Orders.AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.StoreId == storeId && x.Status == OrderStatus.Pending && x.DeliveryUserId == null)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => x.ToDto())
            .ToPagedResultAsync(request, cancellationToken);
    }

    public async Task<PagedResult<Application.Orders.OrderDto>> GetMineAsync(PaginationRequest request, CancellationToken cancellationToken)
    {
        EnsureDeliveryUser();
        if (currentUserService.UserId is null)
        {
            throw new UnauthorizedAppException("Authenticated user is required.");
        }

        var deliveryProfile = await dbContext.DeliveryUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == currentUserService.UserId.Value, cancellationToken)
            ?? throw new NotFoundException("Delivery profile not found.");

        return await dbContext.Orders.AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.DeliveryUserId == deliveryProfile.Id)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => x.ToDto())
            .ToPagedResultAsync(request, cancellationToken);
    }

    public async Task<DeliveryUserDto> UpdateAvailabilityAsync(UpdateAvailabilityRequest request, CancellationToken cancellationToken)
    {
        EnsureDeliveryUser();
        if (currentUserService.UserId is null)
        {
            throw new UnauthorizedAppException("Authenticated user is required.");
        }

        var entity = await dbContext.DeliveryUsers.SingleOrDefaultAsync(x => x.UserId == currentUserService.UserId.Value, cancellationToken)
            ?? throw new NotFoundException("Delivery profile not found.");

        entity.UpdateAvailability(request.Availability);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entity.ToDto();
    }

    private void EnsureDeliveryUser()
    {
        if (currentUserService.Role != UserRole.DeliveryUser)
        {
            throw new ForbiddenException("Delivery user role is required.");
        }
    }
}
