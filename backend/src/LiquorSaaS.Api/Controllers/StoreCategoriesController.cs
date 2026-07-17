using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.StoreCategories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/store-categories")]
public sealed class StoreCategoriesController(IStoreCategoryService storeCategoryService) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<ApiResponse<IReadOnlyList<StoreCategoryDto>>>> GetAll(CancellationToken cancellationToken) => Ok(ApiResponse<IReadOnlyList<StoreCategoryDto>>.Ok(await storeCategoryService.GetAllAsync(cancellationToken), "Categories retrieved successfully."));
    [HttpPost] public async Task<ActionResult<ApiResponse<StoreCategoryDto>>> Create(CreateStoreCategoryRequest request, CancellationToken cancellationToken) => StatusCode(StatusCodes.Status201Created, ApiResponse<StoreCategoryDto>.Ok(await storeCategoryService.CreateAsync(request, cancellationToken), "Category created successfully."));
    [HttpPut("{id:guid}")] public async Task<ActionResult<ApiResponse<StoreCategoryDto>>> Update(Guid id, UpdateStoreCategoryRequest request, CancellationToken cancellationToken) => Ok(ApiResponse<StoreCategoryDto>.Ok(await storeCategoryService.UpdateAsync(id, request, cancellationToken), "Category updated successfully."));
}
