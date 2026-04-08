using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class Order : AuditableEntity
{
    private readonly List<OrderItem> _items = [];

    private Order()
    {
    }

    public Guid StoreId { get; private set; }
    public string CustomerName { get; private set; } = string.Empty;
    public string CustomerPhone { get; private set; } = string.Empty;
    public string DeliveryAddress { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public OrderStatus Status { get; private set; } = OrderStatus.Pending;
    public Guid? DeliveryUserId { get; private set; }
    public decimal Total { get; private set; }
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

    public static Order Create(
        Guid storeId,
        string customerName,
        string customerPhone,
        string deliveryAddress,
        string? notes,
        IEnumerable<OrderItem> items)
    {
        if (string.IsNullOrWhiteSpace(customerName))
        {
            throw new DomainRuleException("Customer name is required.");
        }

        if (string.IsNullOrWhiteSpace(customerPhone))
        {
            throw new DomainRuleException("Customer phone is required.");
        }

        if (string.IsNullOrWhiteSpace(deliveryAddress))
        {
            throw new DomainRuleException("Delivery address is required.");
        }

        var itemList = items.ToList();
        if (itemList.Count == 0)
        {
            throw new DomainRuleException("At least one order item is required.");
        }

        var order = new Order
        {
            StoreId = storeId,
            CustomerName = customerName.Trim(),
            CustomerPhone = customerPhone.Trim(),
            DeliveryAddress = deliveryAddress.Trim(),
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            Status = OrderStatus.Pending
        };

        foreach (var item in itemList)
        {
            item.AttachToOrder(order.Id);
            order._items.Add(item);
        }

        order.RecalculateTotal();
        return order;
    }

    public void UpdateStatus(OrderStatus newStatus)
    {
        if (!CanTransition(Status, newStatus))
        {
            throw new DomainRuleException($"Transition from {Status} to {newStatus} is not allowed.");
        }

        Status = newStatus;
        Touch();
    }

    public void AssignDeliveryUser(Guid deliveryUserId)
    {
        if (DeliveryUserId.HasValue)
        {
            throw new DomainRuleException("Order already has an assigned delivery user.");
        }

        if (Status != OrderStatus.Pending)
        {
            throw new DomainRuleException("Only pending orders can be taken by delivery users.");
        }

        DeliveryUserId = deliveryUserId;
        Status = OrderStatus.OnTheWay;
        Touch();
    }

    public void ReleaseDeliveryUser()
    {
        if (!DeliveryUserId.HasValue)
        {
            throw new DomainRuleException("Order has no assigned delivery user.");
        }

        if (Status != OrderStatus.OnTheWay)
        {
            throw new DomainRuleException("Only orders on the way can be released.");
        }

        DeliveryUserId = null;
        Status = OrderStatus.Pending;
        Touch();
    }

    public void RecalculateTotal()
    {
        Total = _items.Sum(item => item.Subtotal);
        Touch();
    }

    public static bool CanTransition(OrderStatus currentStatus, OrderStatus newStatus)
    {
        return currentStatus switch
        {
            OrderStatus.Pending => newStatus is OrderStatus.Accepted or OrderStatus.Ready or OrderStatus.OnTheWay or OrderStatus.Cancelled,
            OrderStatus.Accepted => newStatus is OrderStatus.Preparing or OrderStatus.Ready or OrderStatus.Cancelled,
            OrderStatus.Preparing => newStatus is OrderStatus.Ready or OrderStatus.Cancelled,
            OrderStatus.Ready => newStatus is OrderStatus.OnTheWay,
            OrderStatus.OnTheWay => newStatus is OrderStatus.Delivered,
            _ => false
        };
    }
}
