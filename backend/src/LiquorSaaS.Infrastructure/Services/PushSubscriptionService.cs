using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Push;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class PushSubscriptionService(
    LiquorSaaSDbContext dbContext,
    ICurrentUserService currentUserService) : IPushSubscriptionService
{
    public async Task<PushSubscriptionRegistrationDto> RegisterCurrentAsync(RegisterPushSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var deliveryUser = await GetCurrentDeliveryUserAsync(cancellationToken);

        var existingSubscription = await dbContext.CourierPushSubscriptions
            .SingleOrDefaultAsync(x => x.Endpoint == request.Endpoint.Trim(), cancellationToken);

        if (existingSubscription is null)
        {
            var entity = CourierPushSubscription.Create(
                deliveryUser.Id,
                deliveryUser.StoreId,
                request.Endpoint,
                request.P256dh,
                request.Auth,
                request.UserAgent);

            await dbContext.CourierPushSubscriptions.AddAsync(entity, cancellationToken);
        }
        else
        {
            existingSubscription.Refresh(
                deliveryUser.Id,
                deliveryUser.StoreId,
                request.P256dh,
                request.Auth,
                request.UserAgent);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new PushSubscriptionRegistrationDto(true, request.Endpoint.Trim());
    }

    public async Task<PushSubscriptionStatusDto> GetCurrentAsync(string? endpoint, CancellationToken cancellationToken)
    {
        var deliveryUser = await GetCurrentDeliveryUserAsync(cancellationToken);
        var normalizedEndpoint = string.IsNullOrWhiteSpace(endpoint) ? null : endpoint.Trim();

        var query = dbContext.CourierPushSubscriptions.AsNoTracking()
            .Where(x => x.DeliveryUserId == deliveryUser.Id && x.IsActive);

        if (normalizedEndpoint is not null)
        {
            query = query.Where(x => x.Endpoint == normalizedEndpoint);
        }

        var subscription = await query
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Select(x => new PushSubscriptionStatusDto(x.IsActive, x.Endpoint))
            .FirstOrDefaultAsync(cancellationToken);

        return subscription ?? new PushSubscriptionStatusDto(false, normalizedEndpoint);
    }

    public async Task DeleteCurrentAsync(DeletePushSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var deliveryUser = await GetCurrentDeliveryUserAsync(cancellationToken);
        var endpoint = request.Endpoint.Trim();

        var subscription = await dbContext.CourierPushSubscriptions
            .SingleOrDefaultAsync(x => x.DeliveryUserId == deliveryUser.Id && x.Endpoint == endpoint, cancellationToken);

        if (subscription is null)
        {
            return;
        }

        subscription.Deactivate();
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<DeliveryUser> GetCurrentDeliveryUserAsync(CancellationToken cancellationToken)
    {
        if (currentUserService.Role != UserRole.DeliveryUser || currentUserService.UserId is null)
        {
            throw new ForbiddenException("Delivery user role is required.");
        }

        return await dbContext.DeliveryUsers
            .SingleOrDefaultAsync(x => x.UserId == currentUserService.UserId.Value, cancellationToken)
            ?? throw new NotFoundException("Delivery profile not found.");
    }
}
