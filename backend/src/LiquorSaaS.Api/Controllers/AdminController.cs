using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Common;
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
}
