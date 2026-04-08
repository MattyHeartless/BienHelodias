using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    Guid? StoreId { get; }
    bool IsAuthenticated { get; }
    UserRole? Role { get; }
}
