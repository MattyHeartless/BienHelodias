using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;

namespace LiquorSaaS.Api.MultiTenancy;

public sealed class HttpTenantProvider(IHttpContextAccessor httpContextAccessor, ICurrentUserService currentUserService) : ITenantProvider
{
    public Guid? StoreId => ResolveStoreId();

    public Guid GetRequiredStoreId() =>
        ResolveStoreId() ?? throw new AppValidationException("StoreId is required. Provide X-Store-Id header or authenticated store claim.");

    private Guid? ResolveStoreId()
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            return null;
        }

        if (httpContext.Request.Headers.TryGetValue("X-Store-Id", out var headerValues) &&
            Guid.TryParse(headerValues.ToString(), out var headerStoreId))
        {
            return headerStoreId;
        }

        if (currentUserService.StoreId.HasValue)
        {
            return currentUserService.StoreId.Value;
        }

        var routeStoreId = httpContext.Request.RouteValues.TryGetValue("storeId", out var routeValue)
            ? routeValue?.ToString()
            : null;

        return Guid.TryParse(routeStoreId, out var parsedRouteStoreId)
            ? parsedRouteStoreId
            : null;
    }
}
