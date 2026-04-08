using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Application.Auth;

public sealed record LoginRequest(string Email, string Password);

public sealed record RefreshTokenRequest();

public sealed record RegisterAdminRequest(string Name, string Email, string Password, Guid StoreId);

public sealed record RegisterDeliveryRequest(string Name, string Email, string Password, string Phone, Guid? StoreId);

public sealed record AuthTokenDto(
    string AccessToken,
    DateTime ExpiresAtUtc,
    Guid UserId,
    string Email,
    UserRole Role,
    Guid? StoreId,
    Guid? DeliveryUserId);

public interface IAuthService
{
    Task<AuthTokenDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthTokenDto> RefreshAsync(CancellationToken cancellationToken);
    Task<AuthTokenDto> RegisterAdminAsync(RegisterAdminRequest request, CancellationToken cancellationToken);
    Task<AuthTokenDto> RegisterDeliveryAsync(RegisterDeliveryRequest request, CancellationToken cancellationToken);
}
