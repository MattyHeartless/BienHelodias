namespace LiquorSaaS.Infrastructure.Services;

public sealed class PushNotificationOptions
{
    public const string SectionName = "PushNotifications";

    public bool Enabled { get; init; }
    public string Subject { get; init; } = string.Empty;
    public string PublicKey { get; init; } = string.Empty;
    public string PrivateKey { get; init; } = string.Empty;
}
