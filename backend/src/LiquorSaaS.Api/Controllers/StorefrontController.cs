using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Storefront;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Route("api/storefront")]
public sealed class StorefrontController(IStorefrontService storefrontService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("content")]
    public async Task<ActionResult<ApiResponse<StorefrontContentDto>>> GetContent(CancellationToken cancellationToken)
    {
        var result = await storefrontService.GetContentAsync(cancellationToken);
        return Ok(ApiResponse<StorefrontContentDto>.Ok(result, "Storefront content retrieved successfully."));
    }
}
