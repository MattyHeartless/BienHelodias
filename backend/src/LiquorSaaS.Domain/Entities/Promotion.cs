using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class Promotion : AuditableEntity
{
    private Promotion()
    {
    }

    public Guid StoreId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;
    public PromotionType Type { get; private set; }
    public decimal? PercentageValue { get; private set; }
    public int? BuyQuantity { get; private set; }
    public int? FreeQuantity { get; private set; }
    public DateTime? ExpirationDate { get; private set; }
    public bool Status { get; private set; } = true;

    public static Promotion Create(
        Guid storeId,
        string name,
        string code,
        PromotionType type,
        decimal? percentageValue,
        int? buyQuantity,
        int? freeQuantity,
        DateTime? expirationDate,
        bool status = true)
    {
        Validate(name, code, type, percentageValue, buyQuantity, freeQuantity);

        return new Promotion
        {
            StoreId = storeId,
            Name = name.Trim(),
            Code = NormalizeCode(code),
            Type = type,
            PercentageValue = type == PromotionType.Percentage ? percentageValue!.Value : null,
            BuyQuantity = type == PromotionType.BuyXGetY ? buyQuantity!.Value : null,
            FreeQuantity = type == PromotionType.BuyXGetY ? freeQuantity!.Value : null,
            ExpirationDate = expirationDate,
            Status = status
        };
    }

    public void Update(
        string name,
        string code,
        PromotionType type,
        decimal? percentageValue,
        int? buyQuantity,
        int? freeQuantity,
        DateTime? expirationDate,
        bool status)
    {
        Validate(name, code, type, percentageValue, buyQuantity, freeQuantity);

        Name = name.Trim();
        Code = NormalizeCode(code);
        Type = type;
        PercentageValue = type == PromotionType.Percentage ? percentageValue!.Value : null;
        BuyQuantity = type == PromotionType.BuyXGetY ? buyQuantity!.Value : null;
        FreeQuantity = type == PromotionType.BuyXGetY ? freeQuantity!.Value : null;
        ExpirationDate = expirationDate;
        Status = status;
        Touch();
    }

    public bool IsActiveAt(DateTime utcNow) =>
        Status && (!ExpirationDate.HasValue || ExpirationDate.Value > utcNow);

    public static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();

    private static void Validate(
        string name,
        string code,
        PromotionType type,
        decimal? percentageValue,
        int? buyQuantity,
        int? freeQuantity)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainRuleException("Promotion name is required.");
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new DomainRuleException("Promotion code is required.");
        }

        if (type == PromotionType.Percentage)
        {
            if (!percentageValue.HasValue || percentageValue <= 0 || percentageValue > 100)
            {
                throw new DomainRuleException("Percentage promotions require a value between 0 and 100.");
            }

            return;
        }

        if (!buyQuantity.HasValue || buyQuantity <= 0)
        {
            throw new DomainRuleException("Buy X Get Y promotions require a buy quantity greater than zero.");
        }

        if (!freeQuantity.HasValue || freeQuantity <= 0)
        {
            throw new DomainRuleException("Buy X Get Y promotions require a free quantity greater than zero.");
        }
    }
}
