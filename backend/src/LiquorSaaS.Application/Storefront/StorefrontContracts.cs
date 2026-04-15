using LiquorSaaS.Application.Banners;

namespace LiquorSaaS.Application.Storefront;

public sealed record StorefrontContentDto(
    string? WelcomePhrase,
    IReadOnlyList<BannerDto> Banners);

public interface IStorefrontService
{
    Task<StorefrontContentDto> GetContentAsync(CancellationToken cancellationToken);
}
