using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireSuperAdmin")]
[Route("api/superadmin")]
public sealed class SuperAdminController(IStoreService storeService) : ControllerBase
{
    [HttpGet("stores")]
    public async Task<ActionResult<ApiResponse<PagedResult<StoreDto>>>> GetStores([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await storeService.ListAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<StoreDto>>.Ok(result, "Stores retrieved successfully."));
    }

    [HttpPatch("stores/{id:guid}/subscription")]
    public async Task<ActionResult<ApiResponse<StoreDto>>> UpdateSubscription(Guid id, [FromBody] UpdateSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var result = await storeService.UpdateSubscriptionAsync(id, request, cancellationToken);
        return Ok(ApiResponse<StoreDto>.Ok(result, "Subscription updated successfully."));
    }
}
