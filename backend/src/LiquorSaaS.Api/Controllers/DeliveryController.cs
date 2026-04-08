using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Application.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireDeliveryUser")]
[Route("api/delivery")]
public sealed class DeliveryController(IDeliveryService deliveryService) : ControllerBase
{
    [HttpGet("orders/available")]
    public async Task<ActionResult<ApiResponse<PagedResult<OrderDto>>>> GetAvailableOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await deliveryService.GetAvailableOrdersAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<OrderDto>>.Ok(result, "Available orders retrieved successfully."));
    }

    [HttpGet("orders/mine")]
    public async Task<ActionResult<ApiResponse<PagedResult<OrderDto>>>> GetMine([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await deliveryService.GetMineAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<OrderDto>>.Ok(result, "Assigned orders retrieved successfully."));
    }

    [HttpPatch("availability")]
    public async Task<ActionResult<ApiResponse<DeliveryUserDto>>> UpdateAvailability([FromBody] UpdateAvailabilityRequest request, CancellationToken cancellationToken)
    {
        var result = await deliveryService.UpdateAvailabilityAsync(request, cancellationToken);
        return Ok(ApiResponse<DeliveryUserDto>.Ok(result, "Availability updated successfully."));
    }
}
