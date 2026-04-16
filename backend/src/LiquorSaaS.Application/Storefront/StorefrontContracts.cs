using LiquorSaaS.Application.Banners;

namespace LiquorSaaS.Application.Storefront;

public sealed record StorefrontStoreDto(
    Guid Id,
    string Name,
    string Slug,
    string? WelcomePhrase);

public sealed record StorefrontContentDto(
    string? WelcomePhrase,
    IReadOnlyList<BannerDto> Banners);

public interface IStorefrontService
{
    Task<StorefrontStoreDto> GetStoreBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<StorefrontContentDto> GetContentAsync(CancellationToken cancellationToken);
}
