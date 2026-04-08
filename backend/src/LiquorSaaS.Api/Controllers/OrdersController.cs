using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Orders;
using LiquorSaaS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController(IOrderService orderService) : ControllerBase
{
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<OrderDto>>>> GetOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] OrderStatus? status = null, CancellationToken cancellationToken = default)
    {
        var result = await orderService.GetStoreOrdersAsync(new PaginationRequest { Page = page, PageSize = pageSize }, status, cancellationToken);
        return Ok(ApiResponse<PagedResult<OrderDto>>.Ok(result, "Orders retrieved successfully."));
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await orderService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<OrderDto>.Ok(result, "Order retrieved successfully."));
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Create([FromBody] CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var result = await orderService.CreateAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<OrderDto>.Ok(result, "Order created successfully."));
    }

    [Authorize]
    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await orderService.UpdateStatusAsync(id, request, cancellationToken);
        return Ok(ApiResponse<OrderDto>.Ok(result, "Order status updated successfully."));
    }

    [Authorize(Policy = "RequireDeliveryUser")]
    [HttpPost("{id:guid}/take")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Take(Guid id, CancellationToken cancellationToken)
    {
        var result = await orderService.TakeAsync(id, cancellationToken);
        return Ok(ApiResponse<OrderDto>.Ok(result, "Order taken successfully."));
    }

    [Authorize]
    [HttpPost("{id:guid}/release")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Release(Guid id, CancellationToken cancellationToken)
    {
        var result = await orderService.ReleaseAsync(id, cancellationToken);
        return Ok(ApiResponse<OrderDto>.Ok(result, "Order released successfully."));
    }
}
