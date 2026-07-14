using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class Store : AuditableEntity
{
    private const int MaxWelcomePhraseLength = 280;
    private const int MaxBusinessAddressLength = 500;
    private const decimal MaxMonetaryAmount = 999999.99m;

    private Store()
    {
    }

    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string? WelcomePhrase { get; private set; }
    public TimeOnly? OpeningTime { get; private set; }
    public TimeOnly? ClosingTime { get; private set; }
    public decimal? CartonPrice { get; private set; }
    public decimal? BucketPrice { get; private set; }
    public decimal? MinimumPurchase { get; private set; }
    public string? BusinessAddress { get; private set; }
    public decimal? Latitude { get; private set; }
    public decimal? Longitude { get; private set; }
    public bool IsActive { get; private set; } = true;
    public SubscriptionStatus SubscriptionStatus { get; private set; } = SubscriptionStatus.Trial;
    public ICollection<Banner> Banners { get; private set; } = [];
    public ICollection<Promotion> Promotions { get; private set; } = [];

    public static Store Create(
        string name,
        string slug,
        SubscriptionStatus subscriptionStatus,
        string? welcomePhrase = null,
        TimeOnly? openingTime = null,
        TimeOnly? closingTime = null,
        decimal? cartonPrice = null,
        decimal? bucketPrice = null,
        decimal? minimumPurchase = null,
        string? businessAddress = null,
        decimal? latitude = null,
        decimal? longitude = null)
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
            OpeningTime = openingTime,
            ClosingTime = closingTime,
            CartonPrice = NormalizeAmount(cartonPrice, "Carton price"),
            BucketPrice = NormalizeAmount(bucketPrice, "Bucket price"),
            MinimumPurchase = NormalizeAmount(minimumPurchase, "Minimum purchase"),
            BusinessAddress = NormalizeBusinessAddress(businessAddress),
            Latitude = NormalizeLatitude(latitude),
            Longitude = NormalizeLongitude(longitude),
            SubscriptionStatus = subscriptionStatus,
            IsActive = true
        };
    }

    public void Update(
        string name,
        string slug,
        bool isActive,
        string? welcomePhrase = null,
        TimeOnly? openingTime = null,
        TimeOnly? closingTime = null,
        decimal? cartonPrice = null,
        decimal? bucketPrice = null,
        decimal? minimumPurchase = null,
        string? businessAddress = null,
        decimal? latitude = null,
        decimal? longitude = null)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(slug))
        {
            throw new DomainRuleException("Store name and slug are required.");
        }

        Name = name.Trim();
        Slug = slug.Trim().ToLowerInvariant();
        WelcomePhrase = NormalizeWelcomePhrase(welcomePhrase);
        OpeningTime = openingTime;
        ClosingTime = closingTime;
        CartonPrice = NormalizeAmount(cartonPrice, "Carton price");
        BucketPrice = NormalizeAmount(bucketPrice, "Bucket price");
        MinimumPurchase = NormalizeAmount(minimumPurchase, "Minimum purchase");
        BusinessAddress = NormalizeBusinessAddress(businessAddress);
        Latitude = NormalizeLatitude(latitude);
        Longitude = NormalizeLongitude(longitude);
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

    private static decimal? NormalizeAmount(decimal? amount, string fieldName)
    {
        if (!amount.HasValue)
        {
            return null;
        }

        if (amount.Value < 0)
        {
            throw new DomainRuleException($"{fieldName} cannot be negative.");
        }

        if (amount.Value > MaxMonetaryAmount)
        {
            throw new DomainRuleException($"{fieldName} cannot exceed {MaxMonetaryAmount}.");
        }

        return decimal.Round(amount.Value, 2, MidpointRounding.AwayFromZero);
    }

    private static string? NormalizeBusinessAddress(string? businessAddress)
    {
        if (string.IsNullOrWhiteSpace(businessAddress))
        {
            return null;
        }

        var normalized = businessAddress.Trim();
        if (normalized.Length > MaxBusinessAddressLength)
        {
            throw new DomainRuleException($"Business address cannot exceed {MaxBusinessAddressLength} characters.");
        }

        return normalized;
    }

    private static decimal? NormalizeLatitude(decimal? latitude)
    {
        if (!latitude.HasValue)
        {
            return null;
        }

        if (latitude.Value < -90m || latitude.Value > 90m)
        {
            throw new DomainRuleException("Latitude must be between -90 and 90.");
        }

        return decimal.Round(latitude.Value, 6, MidpointRounding.AwayFromZero);
    }

    private static decimal? NormalizeLongitude(decimal? longitude)
    {
        if (!longitude.HasValue)
        {
            return null;
        }

        if (longitude.Value < -180m || longitude.Value > 180m)
        {
            throw new DomainRuleException("Longitude must be between -180 and 180.");
        }

        return decimal.Round(longitude.Value, 6, MidpointRounding.AwayFromZero);
    }
}
