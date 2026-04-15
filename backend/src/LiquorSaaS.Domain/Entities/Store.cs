using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class Store : AuditableEntity
{
    private const int MaxWelcomePhraseLength = 280;

    private Store()
    {
    }

    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string? WelcomePhrase { get; private set; }
    public bool IsActive { get; private set; } = true;
    public SubscriptionStatus SubscriptionStatus { get; private set; } = SubscriptionStatus.Trial;
    public ICollection<Banner> Banners { get; private set; } = [];

    public static Store Create(string name, string slug, SubscriptionStatus subscriptionStatus, string? welcomePhrase = null)
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
            WelcomePhrase = NormalizeWelcomePhrase(welcomePhrase),
            SubscriptionStatus = subscriptionStatus,
            IsActive = true
        };
    }

    public void Update(string name, string slug, bool isActive, string? welcomePhrase = null)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(slug))
        {
            throw new DomainRuleException("Store name and slug are required.");
        }

        Name = name.Trim();
        Slug = slug.Trim().ToLowerInvariant();
        WelcomePhrase = NormalizeWelcomePhrase(welcomePhrase);
        IsActive = isActive;
        Touch();
    }

    public void UpdateSubscription(SubscriptionStatus subscriptionStatus)
    {
        SubscriptionStatus = subscriptionStatus;
        Touch();
    }

    private static string? NormalizeWelcomePhrase(string? welcomePhrase)
    {
        if (string.IsNullOrWhiteSpace(welcomePhrase))
        {
            return null;
        }

        var normalized = welcomePhrase.Trim();
        if (normalized.Length > MaxWelcomePhraseLength)
        {
            throw new DomainRuleException($"Welcome phrase cannot exceed {MaxWelcomePhraseLength} characters.");
        }

        return normalized;
    }
}
