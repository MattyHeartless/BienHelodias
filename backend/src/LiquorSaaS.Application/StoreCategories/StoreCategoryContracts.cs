namespace LiquorSaaS.Application.StoreCategories;

public sealed record CreateStoreCategoryRequest(string Name);
public sealed record UpdateStoreCategoryRequest(string Name, bool IsActive, int SortOrder);
public sealed record StoreCategoryDto(Guid Id, Guid StoreId, string Name, bool IsActive, int SortOrder);

public interface IStoreCategoryService
{
    Task<IReadOnlyList<StoreCategoryDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<StoreCategoryDto> CreateAsync(CreateStoreCategoryRequest request, CancellationToken cancellationToken);
    Task<StoreCategoryDto> UpdateAsync(Guid id, UpdateStoreCategoryRequest request, CancellationToken cancellationToken);
}
