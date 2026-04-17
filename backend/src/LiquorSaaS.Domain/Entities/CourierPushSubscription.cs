using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class CourierPushSubscription : AuditableEntity
{
    private CourierPushSubscription()
    {
    }

    public Guid DeliveryUserId { get; private set; }
    public Guid StoreId { get; private set; }
    public string Endpoint { get; private set; } = string.Empty;
    public string P256DH { get; private set; } = string.Empty;
    public string Auth { get; private set; } = string.Empty;
    public string UserAgent { get; private set; } = string.Empty;
    public DateTime? LastNotificationSentAtUtc { get; private set; }
    public bool IsActive { get; private set; } = true;

    public static CourierPushSubscription Create(
        Guid deliveryUserId,
        Guid storeId,
        string endpoint,
        string p256dh,
        string auth,
        string userAgent)
    {
        Validate(endpoint, p256dh, auth);

        return new CourierPushSubscription
        {
            DeliveryUserId = deliveryUserId,
            StoreId = storeId,
            Endpoint = endpoint.Trim(),
            P256DH = p256dh.Trim(),
            Auth = auth.Trim(),
            UserAgent = string.IsNullOrWhiteSpace(userAgent) ? "unknown" : userAgent.Trim(),
            IsActive = true
        };
    }

    public void Refresh(Guid deliveryUserId, Guid storeId, string p256dh, string auth, string userAgent)
    {
        Validate(Endpoint, p256dh, auth);

        DeliveryUserId = deliveryUserId;
        StoreId = storeId;
        P256DH = p256dh.Trim();
        Auth = auth.Trim();
        UserAgent = string.IsNullOrWhiteSpace(userAgent) ? UserAgent : userAgent.Trim();
        IsActive = true;
        Touch();
    }

    public void Deactivate()
    {
        IsActive = false;
        Touch();
    }

    public void MarkNotificationSent()
    {
        LastNotificationSentAtUtc = DateTime.UtcNow;
        Touch();
    }

    private static void Validate(string endpoint, string p256dh, string auth)
    {
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            throw new DomainRuleException("Push subscription endpoint is required.");
        }

        if (string.IsNullOrWhiteSpace(p256dh) || string.IsNullOrWhiteSpace(auth))
        {
            throw new DomainRuleException("Push subscription cryptographic keys are required.");
        }
    }
}
