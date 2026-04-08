using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class Store : AuditableEntity
{
    private Store()
    {
    }

    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;
    public SubscriptionStatus SubscriptionStatus { get; private set; } = SubscriptionStatus.Trial;

    public static Store Create(string name, string slug, SubscriptionStatus subscriptionStatus)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainRuleException("Store name is required.");
        }

        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new DomainRuleException("Store slug is required.");
        }

        return new Store
        {
            Name = name.Trim(),
            Slug = slug.Trim().ToLowerInvariant(),
            SubscriptionStatus = subscriptionStatus,
            IsActive = true
        };
    }

    public void Update(string name, string slug, bool isActive)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(slug))
        {
            throw new DomainRuleException("Store name and slug are required.");
        }

        Name = name.Trim();
        Slug = slug.Trim().ToLowerInvariant();
        IsActive = isActive;
        Touch();
    }

    public void UpdateSubscription(SubscriptionStatus subscriptionStatus)
    {
        SubscriptionStatus = subscriptionStatus;
        Touch();
    }
}
