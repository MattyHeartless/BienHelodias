using LiquorSaaS.Application.Common;

namespace LiquorSaaS.Application.Banners;

public sealed record CreateBannerRequest(
    string Header,
    string Title,
    string Description,
    string? Wildcard,
    DateTime? ExpirationDate,
    bool Status = true);

public sealed record UpdateBannerRequest(
    string Header,
    string Title,
    string Description,
    string? Wildcard,
    DateTime? ExpirationDate,
    bool Status);

public sealed record UpdateBannerStatusRequest(bool Status);

public sealed record BannerDto(
    Guid BannerId,
    Guid StoreId,
    string Header,
    string Title,
    string Description,
    string? Wildcard,
    DateTime? ExpirationDate,
    bool Status,
    DateTime Created);

public interface IBannerService
{
    Task<BannerDto> CreateAsync(CreateBannerRequest request, CancellationToken cancellationToken);
    Task<BannerDto> UpdateAsync(Guid bannerId, UpdateBannerRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid bannerId, CancellationToken cancellationToken);
    Task<BannerDto> GetByIdAsync(Guid bannerId, CancellationToken cancellationToken);
    Task<PagedResult<BannerDto>> GetStoreBannersAsync(PaginationRequest request, CancellationToken cancellationToken);
    Task<PagedResult<BannerDto>> GetActiveBannersAsync(PaginationRequest request, CancellationToken cancellationToken);
    Task<BannerDto> UpdateStatusAsync(Guid bannerId, UpdateBannerStatusRequest request, CancellationToken cancellationToken);
}
