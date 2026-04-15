using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Extensions;
using LiquorSaaS.Infrastructure.Mapping;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class StoreService(
    LiquorSaaSDbContext dbContext,
    ICurrentUserService currentUserService) : IStoreService
{
    public async Task<StoreDto> CreateAsync(CreateStoreRequest request, CancellationToken cancellationToken)
    {
        EnsureSuperAdmin();

        if (await dbContext.Stores.AnyAsync(x => x.Slug == request.Slug.Trim().ToLowerInvariant(), cancellationToken))
        {
            throw new ConflictException("Store slug already exists.");
        }

        var store = Store.Create(request.Name, request.Slug, request.SubscriptionStatus, request.WelcomePhrase);
        await dbContext.Stores.AddAsync(store, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return store.ToDto();
    }

    public async Task<StoreDto> UpdateAsync(Guid id, UpdateStoreRequest request, CancellationToken cancellationToken)
    {
        var store = await dbContext.Stores.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        EnsureStoreAccess(store.Id);

        if (await dbContext.Stores.AnyAsync(x => x.Id != id && x.Slug == request.Slug.Trim().ToLowerInvariant(), cancellationToken))
        {
            throw new ConflictException("Store slug already exists.");
        }

        store.Update(request.Name, request.Slug, request.IsActive, request.WelcomePhrase);
        await dbContext.SaveChangesAsync(cancellationToken);
        return store.ToDto();
    }

    public async Task<StoreDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var store = await dbContext.Stores.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        EnsureStoreAccess(store.Id);
        return store.ToDto();
    }

    public async Task<PagedResult<StoreDto>> ListAsync(PaginationRequest request, CancellationToken cancellationToken)
    {
        IQueryable<Store> query = dbContext.Stores.AsNoTracking().OrderBy(x => x.Name);

        if (currentUserService.Role == UserRole.StoreAdmin && currentUserService.StoreId.HasValue)
        {
            query = query.Where(x => x.Id == currentUserService.StoreId.Value);
        }
        else if (currentUserService.Role != UserRole.SuperAdmin)
        {
            throw new ForbiddenException("Only super admins and store admins can list stores.");
        }

        return await query.Select(x => x.ToDto()).ToPagedResultAsync(request, cancellationToken);
    }

    public async Task<StoreDto> UpdateSubscriptionAsync(Guid id, UpdateSubscriptionRequest request, CancellationToken cancellationToken)
    {
        EnsureSuperAdmin();

        var store = await dbContext.Stores.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        store.UpdateSubscription(request.SubscriptionStatus);
        await dbContext.SaveChangesAsync(cancellationToken);
        return store.ToDto();
    }

    private void EnsureSuperAdmin()
    {
        if (currentUserService.Role != UserRole.SuperAdmin)
        {
            throw new ForbiddenException("Only super admins can perform this operation.");
        }
    }

    private void EnsureStoreAccess(Guid storeId)
    {
        if (currentUserService.Role == UserRole.SuperAdmin)
        {
            return;
        }

        if (currentUserService.Role == UserRole.StoreAdmin && currentUserService.StoreId == storeId)
        {
            return;
        }

        throw new ForbiddenException("You do not have access to this store.");
    }
}
