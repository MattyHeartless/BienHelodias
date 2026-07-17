using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class OrderDeposit : AuditableEntity
{
    private OrderDeposit()
    {
    }

    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public string ProductNameSnapshot { get; private set; } = string.Empty;
    public ContainerDepositType Type { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal Total { get; private set; }

    public static OrderDeposit Create(
        Guid productId,
        string productNameSnapshot,
        ContainerDepositType type,
        int quantity,
        decimal unitPrice)
    {
        if (string.IsNullOrWhiteSpace(productNameSnapshot))
        {
            throw new DomainRuleException("Product name snapshot is required for a deposit.");
        }

        if (type == ContainerDepositType.None)
        {
            throw new DomainRuleException("A deposit type is required.");
        }

        if (quantity <= 0 || unitPrice < 0)
        {
            throw new DomainRuleException("Deposit quantity must be greater than zero and its price cannot be negative.");
        }

        return new OrderDeposit
        {
            ProductId = productId,
            ProductNameSnapshot = productNameSnapshot.Trim(),
            Type = type,
            Quantity = quantity,
            UnitPrice = unitPrice,
            Total = quantity * unitPrice
        };
    }

    internal void AttachToOrder(Guid orderId)
    {
        OrderId = orderId;
        Touch();
    }
}
