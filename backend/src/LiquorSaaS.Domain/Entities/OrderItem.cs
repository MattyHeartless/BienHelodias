using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class OrderItem : AuditableEntity
{
    private OrderItem()
    {
    }

    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public string ProductNameSnapshot { get; private set; } = string.Empty;
    public decimal UnitPrice { get; private set; }
    public int Quantity { get; private set; }
    public decimal Subtotal { get; private set; }
    public int EmptyContainersToExchange { get; private set; }
    public Product? Product { get; private set; }

    public static OrderItem Create(Guid productId, string productNameSnapshot, decimal unitPrice, int quantity, int emptyContainersToExchange = 0)
    {
        if (string.IsNullOrWhiteSpace(productNameSnapshot))
        {
            throw new DomainRuleException("Product name snapshot is required.");
        }

        if (unitPrice <= 0 || quantity <= 0)
        {
            throw new DomainRuleException("Unit price and quantity must be greater than zero.");
        }

        if (emptyContainersToExchange < 0 || emptyContainersToExchange > quantity)
        {
            throw new DomainRuleException("Empty containers to exchange must be between zero and the requested quantity.");
        }

        return new OrderItem
        {
            ProductId = productId,
            ProductNameSnapshot = productNameSnapshot.Trim(),
            UnitPrice = unitPrice,
            Quantity = quantity,
            Subtotal = unitPrice * quantity,
            EmptyContainersToExchange = emptyContainersToExchange
        };
    }

    internal void AttachToOrder(Guid orderId)
    {
        OrderId = orderId;
        Touch();
    }
}
