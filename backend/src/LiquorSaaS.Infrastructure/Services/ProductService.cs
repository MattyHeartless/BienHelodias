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

        var entity = Product.Create(
            storeId,
            request.Name,
            request.Description,
            request.Price,
            request.Stock,
            request.Category,
            request.ImageUrl);

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

        entity.Update(request.Name, request.Description, request.Price, request.Stock, request.Category, request.ImageUrl, request.IsActive);
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

    private void EnsureStoreAdminOrSuperAdmin()
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Store admin or super admin role is required.");
        }
    }
}
