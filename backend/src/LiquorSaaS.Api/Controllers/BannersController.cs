using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiquorSaaS.Api.Controllers;

[ApiController]
[Route("api/banners")]
public sealed class BannersController(IBannerService bannerService) : ControllerBase
{
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<BannerDto>>>> GetStoreBanners([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await bannerService.GetStoreBannersAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<BannerDto>>.Ok(result, "Banners retrieved successfully."));
    }

    [AllowAnonymous]
    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<PagedResult<BannerDto>>>> GetActiveBanners([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await bannerService.GetActiveBannersAsync(new PaginationRequest { Page = page, PageSize = pageSize }, cancellationToken);
        return Ok(ApiResponse<PagedResult<BannerDto>>.Ok(result, "Active banners retrieved successfully."));
    }

    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<BannerDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await bannerService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<BannerDto>.Ok(result, "Banner retrieved successfully."));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<BannerDto>>> Create([FromBody] CreateBannerRequest request, CancellationToken cancellationToken)
    {
        var result = await bannerService.CreateAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<BannerDto>.Ok(result, "Banner created successfully."));
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<BannerDto>>> Update(Guid id, [FromBody] UpdateBannerRequest request, CancellationToken cancellationToken)
    {
        var result = await bannerService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<BannerDto>.Ok(result, "Banner updated successfully."));
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await bannerService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Banner deleted successfully."));
    }

    [Authorize]
    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<BannerDto>>> UpdateStatus(Guid id, [FromBody] UpdateBannerStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await bannerService.UpdateStatusAsync(id, request, cancellationToken);
        return Ok(ApiResponse<BannerDto>.Ok(result, "Banner status updated successfully."));
    }
}
