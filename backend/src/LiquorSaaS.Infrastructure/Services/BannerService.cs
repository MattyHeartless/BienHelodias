using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Extensions;
using LiquorSaaS.Infrastructure.Mapping;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class BannerService(
    LiquorSaaSDbContext dbContext,
    ITenantProvider tenantProvider,
    ICurrentUserService currentUserService) : IBannerService
{
    public async Task<BannerDto> CreateAsync(CreateBannerRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        await EnsureStoreExistsAsync(storeId, cancellationToken);

        var entity = Banner.Create(
            storeId,
            request.Header,
            request.Title,
            request.Description,
            request.Wildcard,
            request.ExpirationDate,
            request.Status);

        await dbContext.Banners.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entity.ToDto();
    }

    public async Task<BannerDto> UpdateAsync(Guid bannerId, UpdateBannerRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Banners.SingleOrDefaultAsync(x => x.BannerId == bannerId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Banner not found.");

        entity.Update(
            request.Header,
            request.Title,
            request.Description,
            request.Wildcard,
            request.ExpirationDate,
            request.Status);

        await dbContext.SaveChangesAsync(cancellationToken);
        return entity.ToDto();
    }

    public async Task DeleteAsync(Guid bannerId, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Banners.SingleOrDefaultAsync(x => x.BannerId == bannerId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Banner not found.");

        dbContext.Banners.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<BannerDto> GetByIdAsync(Guid bannerId, CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();
        var entity = await dbContext.Banners.AsNoTracking()
            .SingleOrDefaultAsync(x => x.BannerId == bannerId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Banner not found.");

        if (!IsBannerVisible(entity) && currentUserService.Role is null)
        {
            throw new NotFoundException("Banner not found.");
        }

        return entity.ToDto();
    }

    public async Task<PagedResult<BannerDto>> GetStoreBannersAsync(PaginationRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        return await dbContext.Banners.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.Created)
            .Select(x => x.ToDto())
            .ToPagedResultAsync(request, cancellationToken);
    }

    public async Task<PagedResult<BannerDto>> GetActiveBannersAsync(PaginationRequest request, CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();
        var utcNow = DateTime.UtcNow;

        return await dbContext.Banners.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.Status && (x.ExpirationDate == null || x.ExpirationDate > utcNow))
            .OrderByDescending(x => x.Created)
            .Select(x => x.ToDto())
            .ToPagedResultAsync(request, cancellationToken);
    }

    public async Task<BannerDto> UpdateStatusAsync(Guid bannerId, UpdateBannerStatusRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Banners.SingleOrDefaultAsync(x => x.BannerId == bannerId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Banner not found.");

        entity.Update(
            entity.Header,
            entity.Title,
            entity.Description,
            entity.Wildcard,
            entity.ExpirationDate,
            request.Status);

        await dbContext.SaveChangesAsync(cancellationToken);
        return entity.ToDto();
    }

    private async Task EnsureStoreExistsAsync(Guid storeId, CancellationToken cancellationToken)
    {
        if (!await dbContext.Stores.AnyAsync(x => x.Id == storeId, cancellationToken))
        {
            throw new NotFoundException("Store not found.");
        }
    }

    private void EnsureStoreAdminOrSuperAdmin()
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Store admin or super admin role is required.");
        }
    }

    private static bool IsBannerVisible(Banner banner) =>
        banner.Status && (banner.ExpirationDate == null || banner.ExpirationDate > DateTime.UtcNow);
}
