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
    private const decimal EarthRadiusKm = 6371.0m;

    public async Task<StorefrontStoreDto> GetStoreBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();

        var store = await dbContext.Stores.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Slug == normalizedSlug && x.IsActive, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        return new StorefrontStoreDto(
            store.Id,
            store.Name,
            store.Slug,
            store.WelcomePhrase,
            store.OpeningTime,
            store.ClosingTime,
            store.CartonPrice,
            store.BucketPrice,
            store.MinimumPurchase,
            store.BusinessAddress,
            store.Latitude,
            store.Longitude);
    }

    public async Task<IReadOnlyList<StorefrontStoreListItemDto>> ListStoresAsync(decimal? latitude, decimal? longitude, CancellationToken cancellationToken)
    {
        var stores = await dbContext.Stores.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var hasOrigin = latitude.HasValue && longitude.HasValue;
        var items = stores
            .Select(store => new StorefrontStoreListItemDto(
                store.Id,
                store.Name,
                store.Slug,
                store.BusinessAddress,
                store.Latitude,
                store.Longitude,
                hasOrigin && store.Latitude.HasValue && store.Longitude.HasValue
                    ? CalculateDistanceKm(latitude!.Value, longitude!.Value, store.Latitude.Value, store.Longitude.Value)
                    : null))
            .ToList();

        if (!hasOrigin)
        {
            return items;
        }

        return items
            .OrderBy(x => x.DistanceKm.HasValue ? 0 : 1)
            .ThenBy(x => x.DistanceKm)
            .ThenBy(x => x.Name)
            .ToList();
    }

    public async Task<StorefrontContentDto> GetContentAsync(CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();
        var utcNow = DateTime.UtcNow;

        var store = await dbContext.Stores.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == storeId, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        var banners = await dbContext.Banners.AsNoTracking()
            .Include(x => x.Promotion)
            .Where(x => x.StoreId == storeId && x.Status && (x.ExpirationDate == null || x.ExpirationDate > utcNow))
            .OrderByDescending(x => x.Created)
            .ToListAsync(cancellationToken);

        var categories = await dbContext.StoreCategories.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .Select(x => new StorefrontCategoryDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);

        return new StorefrontContentDto(store.WelcomePhrase, banners.Select(x => x.ToDto()).ToArray(), categories);
    }

    private static decimal CalculateDistanceKm(decimal originLatitude, decimal originLongitude, decimal targetLatitude, decimal targetLongitude)
    {
        var dLat = ToRadians(targetLatitude - originLatitude);
        var dLon = ToRadians(targetLongitude - originLongitude);
        var lat1 = ToRadians(originLatitude);
        var lat2 = ToRadians(targetLatitude);

        var a =
            (decimal)Math.Pow(Math.Sin((double)(dLat / 2m)), 2) +
            (decimal)Math.Cos((double)lat1) *
            (decimal)Math.Cos((double)lat2) *
            (decimal)Math.Pow(Math.Sin((double)(dLon / 2m)), 2);

        var c = 2m * (decimal)Math.Atan2(Math.Sqrt((double)a), Math.Sqrt((double)(1m - a)));
        return decimal.Round(EarthRadiusKm * c, 2, MidpointRounding.AwayFromZero);
    }

    private static decimal ToRadians(decimal angle) => angle * ((decimal)Math.PI / 180m);
}
