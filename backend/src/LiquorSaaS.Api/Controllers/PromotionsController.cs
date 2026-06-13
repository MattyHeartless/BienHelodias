using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Promotions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Route("api/promotions")]
public sealed class PromotionsController(IPromotionService promotionService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("validate")]
    public async Task<ActionResult<ApiResponse<PromotionValidationDto>>> Validate([FromBody] ValidatePromotionRequest request, CancellationToken cancellationToken)
    {
        var result = await promotionService.ValidateAsync(request, cancellationToken);
        return Ok(ApiResponse<PromotionValidationDto>.Ok(result, "Promotion validated successfully."));
    }
}
