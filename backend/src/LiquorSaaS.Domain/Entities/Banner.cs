using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class Banner
{
    private Banner()
    {
    }

    public Guid BannerId { get; private set; } = Guid.NewGuid();
    public Guid StoreId { get; private set; }
    public string Header { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string? Wildcard { get; private set; }
    public DateTime? ExpirationDate { get; private set; }
    public bool Status { get; private set; } = true;
    public Guid? PromotionId { get; private set; }
    public DateTime Created { get; private set; } = DateTime.UtcNow;
    public Promotion? Promotion { get; private set; }

    public static Banner Create(
        Guid storeId,
        string header,
        string title,
        string description,
        string? wildcard,
        DateTime? expirationDate,
        bool status = true,
        Guid? promotionId = null)
    {
        Validate(header, title, description);

        return new Banner
        {
            StoreId = storeId,
            Header = header.Trim(),
            Title = title.Trim(),
            Description = description.Trim(),
            Wildcard = string.IsNullOrWhiteSpace(wildcard) ? null : wildcard.Trim(),
            ExpirationDate = expirationDate,
            Status = status,
            PromotionId = promotionId,
            Created = DateTime.UtcNow
        };
    }

    public void Update(
        string header,
        string title,
        string description,
        string? wildcard,
        DateTime? expirationDate,
        bool status,
        Guid? promotionId)
    {
        Validate(header, title, description);

        Header = header.Trim();
        Title = title.Trim();
        Description = description.Trim();
        Wildcard = string.IsNullOrWhiteSpace(wildcard) ? null : wildcard.Trim();
        ExpirationDate = expirationDate;
        Status = status;
        PromotionId = promotionId;
    }

    private static void Validate(string header, string title, string description)
    {
        if (string.IsNullOrWhiteSpace(header))
        {
            throw new DomainRuleException("Banner header is required.");
        }

        if (string.IsNullOrWhiteSpace(title))
        {
            throw new DomainRuleException("Banner title is required.");
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            throw new DomainRuleException("Banner description is required.");
        }
    }
}
