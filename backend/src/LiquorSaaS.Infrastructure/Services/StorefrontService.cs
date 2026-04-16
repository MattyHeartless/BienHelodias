using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Storefront;
using LiquorSaaS.Infrastructure.Mapping;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class StorefrontService(
    LiquorSaaSDbContext dbContext,
    ITenantProvider tenantProvider) : IStorefrontService
{
    public async Task<StorefrontStoreDto> GetStoreBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();

        var store = await dbContext.Stores.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Slug == normalizedSlug && x.IsActive, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        return new StorefrontStoreDto(store.Id, store.Name, store.Slug, store.WelcomePhrase);
    }

    public async Task<StorefrontContentDto> GetContentAsync(CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();
        var utcNow = DateTime.UtcNow;

        var store = await dbContext.Stores.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == storeId, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        var banners = await dbContext.Banners.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.Status && (x.ExpirationDate == null || x.ExpirationDate > utcNow))
            .OrderByDescending(x => x.Created)
            .Select(x => x.ToDto())
            .ToListAsync(cancellationToken);

        return new StorefrontContentDto(store.WelcomePhrase, banners);
    }
}
