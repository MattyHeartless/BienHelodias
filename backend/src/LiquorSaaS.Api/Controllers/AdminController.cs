using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Delivery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin")]
public sealed class AdminController(IAdminService adminService) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<ApiResponse<DashboardDto>>> GetDashboard(CancellationToken cancellationToken)
    {
        var result = await adminService.GetDashboardAsync(cancellationToken);
        return Ok(ApiResponse<DashboardDto>.Ok(result, "Dashboard retrieved successfully."));
    }

    [HttpGet("delivery-users")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DeliveryUserDto>>>> GetDeliveryUsers(CancellationToken cancellationToken)
    {
        var result = await adminService.GetDeliveryUsersAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DeliveryUserDto>>.Ok(result, "Delivery users retrieved successfully."));
    }

    [HttpPatch("delivery-users/{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<DeliveryUserDto>>> UpdateDeliveryUserStatus(Guid id, [FromBody] UpdateDeliveryUserStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await adminService.UpdateDeliveryUserStatusAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DeliveryUserDto>.Ok(result, "Delivery user status updated successfully."));
    }
}
