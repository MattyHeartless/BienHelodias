using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Products;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Extensions;
using LiquorSaaS.Infrastructure.Mapping;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class ProductService(
    LiquorSaaSDbContext dbContext,
    ITenantProvider tenantProvider,
    ICurrentUserService currentUserService) : IProductService
{
    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        await EnsureStoreExistsAsync(storeId, cancellationToken);
        await EnsureDepositPriceConfiguredAsync(storeId, request.DepositType, cancellationToken);

        var category = await GetCategoryAsync(storeId, request.StoreCategoryId, request.Category, cancellationToken);
        var entity = Product.Create(
            storeId,
            request.Name,
            request.Description,
            request.Price,
            request.Stock,
            category.Name,
            request.ImageUrl,
            request.DepositType);
        entity.AssignStoreCategory(category);

        await dbContext.Products.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entity.ToDto();
    }

    public async Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Products.SingleOrDefaultAsync(x => x.Id == id && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        await EnsureDepositPriceConfiguredAsync(storeId, request.DepositType, cancellationToken);
        var category = await GetCategoryAsync(storeId, request.StoreCategoryId, request.Category, cancellationToken);
        entity.Update(request.Name, request.Description, request.Price, request.Stock, category.Name, request.ImageUrl, request.IsActive, request.DepositType);
        entity.AssignStoreCategory(category);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entity.ToDto();
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Products.SingleOrDefaultAsync(x => x.Id == id && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        if (await dbContext.OrderItems.AnyAsync(x => x.ProductId == id, cancellationToken))
        {
            throw new ConflictException("Product cannot be deleted because it is referenced by orders.");
        }

        dbContext.Products.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<ProductDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();
        var entity = await dbContext.Products.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        if (!entity.IsActive && currentUserService.Role is null)
        {
            throw new NotFoundException("Product not found.");
        }

        return entity.ToDto();
    }

    public async Task<PagedResult<ProductDto>> GetStoreProductsAsync(PaginationRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        return await dbContext.Products.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderBy(x => x.Name)
            .Select(x => x.ToDto())
            .ToPagedResultAsync(request, cancellationToken);
    }

    public async Task<PagedResult<ProductDto>> GetPublicCatalogAsync(PaginationRequest request, CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();

        return await dbContext.Products.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => x.ToDto())
            .ToPagedResultAsync(request, cancellationToken);
    }

    public async Task<ProductDto> UpdateStatusAsync(Guid id, UpdateProductStatusRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();

        var entity = await dbContext.Products.SingleOrDefaultAsync(x => x.Id == id && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        entity.SetActiveStatus(request.IsActive);
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

    private async Task<StoreCategory> GetCategoryAsync(Guid storeId, Guid? categoryId, string categoryName, CancellationToken cancellationToken)
    {
        if (categoryId.HasValue)
        {
            return await dbContext.StoreCategories.SingleOrDefaultAsync(x => x.Id == categoryId.Value && x.StoreId == storeId && x.IsActive, cancellationToken)
                ?? throw new AppValidationException("Select an active category from this store.");
        }

        var normalizedName = categoryName?.Trim() ?? string.Empty;
        var nameKey = normalizedName.ToUpperInvariant();
        var existing = await dbContext.StoreCategories.SingleOrDefaultAsync(x => x.StoreId == storeId && x.Name.ToUpper() == nameKey, cancellationToken);
        if (existing is not null) return existing;
        var category = StoreCategory.Create(storeId, normalizedName);
        await dbContext.StoreCategories.AddAsync(category, cancellationToken);
        return category;
    }

    private void EnsureStoreAdminOrSuperAdmin()
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Store admin or super admin role is required.");
        }
    }

    private async Task EnsureDepositPriceConfiguredAsync(Guid storeId, ContainerDepositType depositType, CancellationToken cancellationToken)
    {
        if (depositType == ContainerDepositType.None)
        {
            return;
        }

        var store = await dbContext.Stores.AsNoTracking().SingleAsync(x => x.Id == storeId, cancellationToken);
        var price = depositType == ContainerDepositType.Bucket ? store.BucketPrice : store.CartonPrice;

        if (!price.HasValue)
        {
            throw new AppValidationException($"Configure the {depositType} deposit price before assigning it to a product.");
        }
    }
}
