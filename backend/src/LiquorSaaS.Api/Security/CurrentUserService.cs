using System.Security.Claims;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Api.Security;

public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public Guid? UserId => TryReadGuid(ClaimTypes.NameIdentifier) ?? TryReadGuid("sub");
    public string? Email => httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email)
        ?? httpContextAccessor.HttpContext?.User.FindFirstValue("email");
    public Guid? StoreId => TryReadGuid("storeId");
    public bool IsAuthenticated => httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public UserRole? Role
    {
        get
        {
            var rawRole = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Role)
                ?? httpContextAccessor.HttpContext?.User.FindFirstValue("role");

            return Enum.TryParse<UserRole>(rawRole, ignoreCase: true, out var role)
                ? role
                : null;
        }
    }

    private Guid? TryReadGuid(string claimType)
    {
        var value = httpContextAccessor.HttpContext?.User.FindFirstValue(claimType);
        return Guid.TryParse(value, out var guidValue) ? guidValue : null;
    }
}
