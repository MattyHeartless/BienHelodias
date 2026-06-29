using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireSuperAdmin")]
[Route("api/superadmin")]
public sealed class SuperAdminController(IStoreService storeService, IAdminService adminService) : ControllerBase
{
    [HttpGet("dashboard/overview")]
    public async Task<ActionResult<ApiResponse<SuperAdminDashboardOverviewDto>>> GetDashboardOverview(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var result = await adminService.GetSuperAdminDashboardOverviewAsync(from, to, cancellationToken);
        return Ok(ApiResponse<SuperAdminDashboardOverviewDto>.Ok(result, "Super admin dashboard overview retrieved successfully."));
    }

    [HttpGet("stores")]
    public async Task<ActionResult<ApiResponse<PagedResult<StoreDto>>>> GetStores([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await storeService.ListAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<StoreDto>>.Ok(result, "Stores retrieved successfully."));
    }

    [HttpGet("stores/{id:guid}/admins")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<StoreAdminDto>>>> GetStoreAdmins(Guid id, CancellationToken cancellationToken)
    {
        var result = await adminService.GetStoreAdminsAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StoreAdminDto>>.Ok(result, "Store admins retrieved successfully."));
    }

    [HttpPatch("stores/{id:guid}/subscription")]
    public async Task<ActionResult<ApiResponse<StoreDto>>> UpdateSubscription(Guid id, [FromBody] UpdateSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var result = await storeService.UpdateSubscriptionAsync(id, request, cancellationToken);
        return Ok(ApiResponse<StoreDto>.Ok(result, "Subscription updated successfully."));
    }
}
