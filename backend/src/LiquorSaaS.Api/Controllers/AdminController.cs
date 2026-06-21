using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Application.InventoryAi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin")]
public sealed class AdminController(IAdminService adminService, IInventoryAiService inventoryAiService) : ControllerBase
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

    [HttpPost("inventory-ai/analyze")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<InventoryAiAnalysisDto>>> AnalyzeInventoryImage([FromForm] AnalyzeInventoryImageForm form, CancellationToken cancellationToken)
    {
        if (form.Image is null)
        {
            return UnprocessableEntity(ApiResponse<object>.Fail("Image is required."));
        }

        await using var stream = form.Image.OpenReadStream();
        await using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream, cancellationToken);

        var result = await inventoryAiService.AnalyzeAsync(
            new AnalyzeInventoryImageRequest(
                form.Image.FileName,
                form.Image.ContentType,
                memoryStream.ToArray()),
            cancellationToken);

        return Ok(ApiResponse<InventoryAiAnalysisDto>.Ok(result, "Inventory image analyzed successfully."));
    }

    [HttpPost("inventory-ai/commit")]
    public async Task<ActionResult<ApiResponse<InventoryAiCommitResultDto>>> CommitInventoryChanges([FromBody] CommitInventoryAiRequest request, CancellationToken cancellationToken)
    {
        var result = await inventoryAiService.CommitAsync(request, cancellationToken);
        return Ok(ApiResponse<InventoryAiCommitResultDto>.Ok(result, "Inventory AI changes applied successfully."));
    }
}

public sealed class AnalyzeInventoryImageForm
{
    public IFormFile? Image { get; init; }
}
