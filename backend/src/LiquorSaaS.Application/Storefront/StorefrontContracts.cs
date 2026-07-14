using LiquorSaaS.Application.Banners;

namespace LiquorSaaS.Application.Storefront;

public sealed record StorefrontStoreDto(
    Guid Id,
    string Name,
    string Slug,
    string? WelcomePhrase,
    TimeOnly? OpeningTime,
    TimeOnly? ClosingTime,
    decimal? CartonPrice,
    decimal? BucketPrice,
    decimal? MinimumPurchase,
    string? BusinessAddress,
    decimal? Latitude,
    decimal? Longitude);

public sealed record StorefrontStoreListItemDto(
    Guid Id,
    string Name,
    string Slug,
    string? BusinessAddress,
    decimal? Latitude,
    decimal? Longitude,
    decimal? DistanceKm);

public sealed record StorefrontContentDto(
    string? WelcomePhrase,
    IReadOnlyList<BannerDto> Banners);

public interface IStorefrontService
{
    Task<StorefrontStoreDto> GetStoreBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<IReadOnlyList<StorefrontStoreListItemDto>> ListStoresAsync(decimal? latitude, decimal? longitude, CancellationToken cancellationToken);
    Task<StorefrontContentDto> GetContentAsync(CancellationToken cancellationToken);
}
