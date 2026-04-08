using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController(IProductService productService) : ControllerBase
{
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductDto>>>> GetStoreProducts([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await productService.GetStoreProductsAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<ProductDto>>.Ok(result, "Products retrieved successfully."));
    }

    [AllowAnonymous]
    [HttpGet("catalog")]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductDto>>>> GetPublicCatalog([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await productService.GetPublicCatalogAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<ProductDto>>.Ok(result, "Catalog retrieved successfully."));
    }

    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await productService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(result, "Product retrieved successfully."));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create([FromBody] CreateProductRequest request, CancellationToken cancellationToken)
    {
        var result = await productService.CreateAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<ProductDto>.Ok(result, "Product created successfully."));
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(Guid id, [FromBody] UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var result = await productService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(result, "Product updated successfully."));
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await productService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Product deleted successfully."));
    }

    [Authorize]
    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> UpdateStatus(Guid id, [FromBody] UpdateProductStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await productService.UpdateStatusAsync(id, request, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(result, "Product status updated successfully."));
    }
}
