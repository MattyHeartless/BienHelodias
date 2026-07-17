using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class Product : AuditableEntity
{
    private Product()
    {
    }

    public Guid StoreId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public int Stock { get; private set; }
    public string? ImageUrl { get; private set; }
    public bool IsActive { get; private set; } = true;
    public string Category { get; private set; } = string.Empty;
    public Guid? StoreCategoryId { get; private set; }
    public ContainerDepositType DepositType { get; private set; }

    public static Product Create(
        Guid storeId,
        string name,
        string description,
        decimal price,
        int stock,
        string category,
        string? imageUrl,
        ContainerDepositType depositType = ContainerDepositType.None)
    {
        Validate(name, price, stock, category);

        return new Product
        {
            StoreId = storeId,
            Name = name.Trim(),
            Description = description.Trim(),
            Price = price,
            Stock = stock,
            Category = category.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim(),
            DepositType = NormalizeDepositType(depositType),
            IsActive = true
        };
    }

    public void Update(
        string name,
        string description,
        decimal price,
        int stock,
        string category,
        string? imageUrl,
        bool isActive,
        ContainerDepositType depositType = ContainerDepositType.None)
    {
        Validate(name, price, stock, category);

        Name = name.Trim();
        Description = description.Trim();
        Price = price;
        Stock = stock;
        Category = category.Trim();
        ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
        IsActive = isActive;
        DepositType = NormalizeDepositType(depositType);
        Touch();
    }

    public void SetActiveStatus(bool isActive)
    {
        IsActive = isActive;
        Touch();
    }

    public void AssignStoreCategory(StoreCategory category)
    {
        if (category.StoreId != StoreId) throw new DomainRuleException("Product category must belong to the same store.");
        StoreCategoryId = category.Id;
        Category = category.Name;
        Touch();
    }

    private static void Validate(string name, decimal price, int stock, string category)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainRuleException("Product name is required.");
        }

        if (price <= 0)
        {
            throw new DomainRuleException("Product price must be greater than zero.");
        }

        if (stock < 0)
        {
            throw new DomainRuleException("Product stock cannot be negative.");
        }

        if (string.IsNullOrWhiteSpace(category))
        {
            throw new DomainRuleException("Product category is required.");
        }
    }

    private static ContainerDepositType NormalizeDepositType(ContainerDepositType depositType)
    {
        if (!Enum.IsDefined(depositType))
        {
            throw new DomainRuleException("Product deposit type is invalid.");
        }

        return depositType;
    }
}
