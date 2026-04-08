using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthTokenDto>>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthTokenDto>.Ok(result, "Login successful."));
    }

    [Authorize]
    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<AuthTokenDto>>> Refresh(CancellationToken cancellationToken)
    {
        var result = await authService.RefreshAsync(cancellationToken);
        return Ok(ApiResponse<AuthTokenDto>.Ok(result, "Token refreshed successfully."));
    }

    [Authorize(Policy = "RequireSuperAdmin")]
    [HttpPost("register-admin")]
    public async Task<ActionResult<ApiResponse<AuthTokenDto>>> RegisterAdmin([FromBody] RegisterAdminRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterAdminAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<AuthTokenDto>.Ok(result, "Store admin registered successfully."));
    }

    [Authorize]
    [HttpPost("register-delivery")]
    public async Task<ActionResult<ApiResponse<AuthTokenDto>>> RegisterDelivery([FromBody] RegisterDeliveryRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterDeliveryAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<AuthTokenDto>.Ok(result, "Delivery user registered successfully."));
    }
}
