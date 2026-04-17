using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Push;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireDeliveryUser")]
[Route("api/push-subscriptions")]
public sealed class PushSubscriptionsController(IPushSubscriptionService pushSubscriptionService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ApiResponse<PushSubscriptionRegistrationDto>>> Register(
        [FromBody] RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await pushSubscriptionService.RegisterCurrentAsync(request, cancellationToken);
        return Ok(ApiResponse<PushSubscriptionRegistrationDto>.Ok(result, "Push subscription registered successfully."));
    }

    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<PushSubscriptionStatusDto>>> GetCurrent(
        [FromQuery] string? endpoint,
        CancellationToken cancellationToken)
    {
        var result = await pushSubscriptionService.GetCurrentAsync(endpoint, cancellationToken);
        return Ok(ApiResponse<PushSubscriptionStatusDto>.Ok(result, "Push subscription status retrieved successfully."));
    }

    [HttpDelete("current")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteCurrent(
        [FromBody] DeletePushSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        await pushSubscriptionService.DeleteCurrentAsync(request, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Push subscription deactivated successfully."));
    }
}
