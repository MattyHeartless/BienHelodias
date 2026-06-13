using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Promotions;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;
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

        var promotion = await UpsertPromotionAsync(
            storeId,
            request.Title,
            request.ExpirationDate,
            request.Status,
            request.Promotion,
            currentPromotion: null,
            cancellationToken);

        var entity = Banner.Create(
            storeId,
            request.Header,
            request.Title,
            request.Description,
            request.Wildcard,
            request.ExpirationDate,
            request.Status,
            promotion?.Id);

        await dbContext.Banners.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await dbContext.Entry(entity).Reference(x => x.Promotion).LoadAsync(cancellationToken);
        return entity.ToDto();
    }

    public async Task<BannerDto> UpdateAsync(Guid bannerId, UpdateBannerRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Banners
            .Include(x => x.Promotion)
            .SingleOrDefaultAsync(x => x.BannerId == bannerId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Banner not found.");

        var promotion = await UpsertPromotionAsync(
            storeId,
            request.Title,
            request.ExpirationDate,
            request.Status,
            request.Promotion,
            entity.Promotion,
            cancellationToken);

        entity.Update(
            request.Header,
            request.Title,
            request.Description,
            request.Wildcard,
            request.ExpirationDate,
            request.Status,
            promotion?.Id);

        await dbContext.SaveChangesAsync(cancellationToken);
        return entity.ToDto();
    }

    public async Task DeleteAsync(Guid bannerId, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Banners
            .Include(x => x.Promotion)
            .SingleOrDefaultAsync(x => x.BannerId == bannerId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Banner not found.");

        if (entity.Promotion is not null)
        {
            dbContext.Promotions.Remove(entity.Promotion);
        }

        dbContext.Banners.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<BannerDto> GetByIdAsync(Guid bannerId, CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();
        var entity = await dbContext.Banners.AsNoTracking()
            .Include(x => x.Promotion)
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

        var query = dbContext.Banners.AsNoTracking()
            .Include(x => x.Promotion)
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.Created);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<BannerDto>
        {
            Page = request.Page,
            PageSize = request.PageSize,
            Total = total,
            Items = items.Select(x => x.ToDto()).ToArray()
        };
    }

    public async Task<PagedResult<BannerDto>> GetActiveBannersAsync(PaginationRequest request, CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();
        var utcNow = DateTime.UtcNow;

        var query = dbContext.Banners.AsNoTracking()
            .Include(x => x.Promotion)
            .Where(x => x.StoreId == storeId && x.Status && (x.ExpirationDate == null || x.ExpirationDate > utcNow))
            .OrderByDescending(x => x.Created);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<BannerDto>
        {
            Page = request.Page,
            PageSize = request.PageSize,
            Total = total,
            Items = items.Select(x => x.ToDto()).ToArray()
        };
    }

    public async Task<BannerDto> UpdateStatusAsync(Guid bannerId, UpdateBannerStatusRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Banners
            .Include(x => x.Promotion)
            .SingleOrDefaultAsync(x => x.BannerId == bannerId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Banner not found.");

        if (entity.Promotion is not null)
        {
            entity.Promotion.Update(
                entity.Promotion.Name,
                entity.Promotion.Code,
                entity.Promotion.Type,
                entity.Promotion.PercentageValue,
                entity.Promotion.BuyQuantity,
                entity.Promotion.FreeQuantity,
                entity.ExpirationDate,
                request.Status);
        }

        entity.Update(
            entity.Header,
            entity.Title,
            entity.Description,
            entity.Wildcard,
            entity.ExpirationDate,
            request.Status,
            entity.PromotionId);

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

    private async Task<Promotion?> UpsertPromotionAsync(
        Guid storeId,
        string bannerTitle,
        DateTime? expirationDate,
        bool status,
        PromotionConfigurationRequest? configuration,
        Promotion? currentPromotion,
        CancellationToken cancellationToken)
    {
        if (configuration is null)
        {
            if (currentPromotion is not null)
            {
                dbContext.Promotions.Remove(currentPromotion);
            }

            return null;
        }

        var code = string.IsNullOrWhiteSpace(configuration.Code)
            ? await GenerateUniquePromotionCodeAsync(bannerTitle, storeId, cancellationToken)
            : Promotion.NormalizeCode(configuration.Code);
        var name = string.IsNullOrWhiteSpace(configuration.Name) ? bannerTitle : configuration.Name.Trim();
        int? buyQuantity = configuration.Type == PromotionType.BuyXGetY ? configuration.BuyQuantity ?? 1 : null;
        int? freeQuantity = configuration.Type == PromotionType.BuyXGetY ? configuration.FreeQuantity ?? 1 : null;

        await EnsurePromotionCodeAvailableAsync(storeId, code, currentPromotion?.Id, cancellationToken);

        try
        {
            if (currentPromotion is null)
            {
                var promotion = Promotion.Create(
                    storeId,
                    name,
                    code,
                    configuration.Type,
                    configuration.PercentageValue,
                    buyQuantity,
                    freeQuantity,
                    expirationDate,
                    status);

                await dbContext.Promotions.AddAsync(promotion, cancellationToken);
                return promotion;
            }

            currentPromotion.Update(
                name,
                code,
                configuration.Type,
                configuration.PercentageValue,
                buyQuantity,
                freeQuantity,
                expirationDate,
                status);

            return currentPromotion;
        }
        catch (DomainRuleException ex)
        {
            throw new AppValidationException(ex.Message);
        }
    }

    private async Task EnsurePromotionCodeAvailableAsync(Guid storeId, string code, Guid? currentPromotionId, CancellationToken cancellationToken)
    {
        var exists = await dbContext.Promotions.AsNoTracking()
            .AnyAsync(
                x => x.StoreId == storeId
                    && x.Code == code
                    && (!currentPromotionId.HasValue || x.Id != currentPromotionId.Value),
                cancellationToken);

        if (exists)
        {
            throw new ConflictException("Promotion code already exists for this store.");
        }
    }

    private async Task<string> GenerateUniquePromotionCodeAsync(string source, Guid storeId, CancellationToken cancellationToken)
    {
        var seed = new string(source
            .Where(char.IsLetterOrDigit)
            .ToArray())
            .ToUpperInvariant();

        seed = string.IsNullOrWhiteSpace(seed) ? "PROMO" : seed[..Math.Min(seed.Length, 8)];

        for (var attempt = 0; attempt < 10; attempt++)
        {
            var suffix = Random.Shared.Next(1000, 9999);
            var code = $"{seed}{suffix}";
            var exists = await dbContext.Promotions.AsNoTracking()
                .AnyAsync(x => x.StoreId == storeId && x.Code == code, cancellationToken);

            if (!exists)
            {
                return code;
            }
        }

        throw new ConflictException("Could not generate a unique promotion code.");
    }
}
