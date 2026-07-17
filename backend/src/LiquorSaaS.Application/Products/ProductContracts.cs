using LiquorSaaS.Application.Common;
using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Application.Products;

public sealed record CreateProductRequest(
    string Name,
    string Description,
    decimal Price,
    int Stock,
    string Category,
    string? ImageUrl,
    ContainerDepositType DepositType = ContainerDepositType.None,
    Guid? StoreCategoryId = null);

public sealed record UpdateProductRequest(
    string Name,
    string Description,
    decimal Price,
    int Stock,
    string Category,
    string? ImageUrl,
    bool IsActive,
    ContainerDepositType DepositType = ContainerDepositType.None,
    Guid? StoreCategoryId = null);

public sealed record UpdateProductStatusRequest(bool IsActive);

public sealed record ProductDto(
    Guid Id,
    Guid StoreId,
    string Name,
    string Description,
    decimal Price,
    int Stock,
    string Category,
    Guid? StoreCategoryId,
    string? ImageUrl,
    bool IsActive,
    ContainerDepositType DepositType,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public interface IProductService
{
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<ProductDto> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<PagedResult<ProductDto>> GetStoreProductsAsync(PaginationRequest request, CancellationToken cancellationToken);
    Task<PagedResult<ProductDto>> GetPublicCatalogAsync(PaginationRequest request, CancellationToken cancellationToken);
    Task<ProductDto> UpdateStatusAsync(Guid id, UpdateProductStatusRequest request, CancellationToken cancellationToken);
}
