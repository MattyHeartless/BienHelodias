namespace LiquorSaaS.Application.Push;

public sealed record RegisterPushSubscriptionRequest(
    string Endpoint,
    string P256dh,
    string Auth,
    string UserAgent);

public sealed record DeletePushSubscriptionRequest(string Endpoint);

public sealed record PushSubscriptionStatusDto(bool IsActive, string? Endpoint);

public sealed record PushSubscriptionRegistrationDto(bool Registered, string Endpoint);

public interface IPushSubscriptionService
{
    Task<PushSubscriptionRegistrationDto> RegisterCurrentAsync(RegisterPushSubscriptionRequest request, CancellationToken cancellationToken);
    Task<PushSubscriptionStatusDto> GetCurrentAsync(string? endpoint, CancellationToken cancellationToken);
    Task DeleteCurrentAsync(DeletePushSubscriptionRequest request, CancellationToken cancellationToken);
}

public interface IPushNotificationService
{
    Task NotifyNewOrderAsync(Guid orderId, CancellationToken cancellationToken);
}
