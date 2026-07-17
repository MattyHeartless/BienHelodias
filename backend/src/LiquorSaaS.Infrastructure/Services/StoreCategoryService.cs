using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.StoreCategories;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class StoreCategoryService(LiquorSaaSDbContext dbContext, ITenantProvider tenantProvider, ICurrentUserService currentUserService) : IStoreCategoryService
{
    public async Task<IReadOnlyList<StoreCategoryDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();
        return await dbContext.StoreCategories.AsNoTracking().Where(x => x.StoreId == storeId)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new StoreCategoryDto(x.Id, x.StoreId, x.Name, x.IsActive, x.SortOrder)).ToArrayAsync(cancellationToken);
    }

    public async Task<StoreCategoryDto> CreateAsync(CreateStoreCategoryRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();
        var name = request.Name.Trim();
        var nameKey = name.ToUpperInvariant();
        if (await dbContext.StoreCategories.AnyAsync(x => x.StoreId == storeId && x.Name.ToUpper() == nameKey, cancellationToken)) throw new ConflictException("A category with that name already exists.");
        var sortOrder = (await dbContext.StoreCategories.Where(x => x.StoreId == storeId).Select(x => (int?)x.SortOrder).MaxAsync(cancellationToken) ?? -1) + 1;
        var category = StoreCategory.Create(storeId, name, sortOrder);
        await dbContext.StoreCategories.AddAsync(category, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new StoreCategoryDto(category.Id, category.StoreId, category.Name, category.IsActive, category.SortOrder);
    }

    public async Task<StoreCategoryDto> UpdateAsync(Guid id, UpdateStoreCategoryRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();
        var storeId = tenantProvider.GetRequiredStoreId();
        var category = await dbContext.StoreCategories.SingleOrDefaultAsync(x => x.Id == id && x.StoreId == storeId, cancellationToken) ?? throw new NotFoundException("Category not found.");
        var name = request.Name.Trim();
        var nameKey = name.ToUpperInvariant();
        if (await dbContext.StoreCategories.AnyAsync(x => x.Id != id && x.StoreId == storeId && x.Name.ToUpper() == nameKey, cancellationToken)) throw new ConflictException("A category with that name already exists.");
        category.Update(name, request.IsActive, request.SortOrder);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new StoreCategoryDto(category.Id, category.StoreId, category.Name, category.IsActive, category.SortOrder);
    }

    private void EnsureStoreAdminOrSuperAdmin()
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.SuperAdmin)) throw new ForbiddenException("Store admin or super admin role is required.");
    }
}
