using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/stores")]
public sealed class StoresController(IStoreService storeService) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<StoreDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await storeService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<StoreDto>.Ok(result, "Store retrieved successfully."));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<StoreDto>>> Create([FromBody] CreateStoreRequest request, CancellationToken cancellationToken)
    {
        var result = await storeService.CreateAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<StoreDto>.Ok(result, "Store created successfully."));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<StoreDto>>> Update(Guid id, [FromBody] UpdateStoreRequest request, CancellationToken cancellationToken)
    {
        var result = await storeService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<StoreDto>.Ok(result, "Store updated successfully."));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<StoreDto>>>> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await storeService.ListAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<StoreDto>>.Ok(result, "Stores retrieved successfully."));
    }
}
