using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class StoreCategory : AuditableEntity
{
    private StoreCategory() { }

    public Guid StoreId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;
    public int SortOrder { get; private set; }

    public static StoreCategory Create(Guid storeId, string name, int sortOrder = 0)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new DomainRuleException("Category name is required.");
        return new StoreCategory { StoreId = storeId, Name = name.Trim(), SortOrder = sortOrder, IsActive = true };
    }

    public void Update(string name, bool isActive, int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new DomainRuleException("Category name is required.");
        Name = name.Trim();
        IsActive = isActive;
        SortOrder = sortOrder;
        Touch();
    }
}
