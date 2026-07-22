using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class Order : AuditableEntity
{
    private readonly List<OrderItem> _items = [];
    private readonly List<OrderDeposit> _deposits = [];

    private Order()
    {
    }

    public Guid StoreId { get; private set; }
    public string CustomerName { get; private set; } = string.Empty;
    public string CustomerPhone { get; private set; } = string.Empty;
    public string DeliveryAddress { get; private set; } = string.Empty;
    public decimal? DeliveryLatitude { get; private set; }
    public decimal? DeliveryLongitude { get; private set; }
    public string? Notes { get; private set; }
    public OrderStatus Status { get; private set; } = OrderStatus.Pending;
    public Guid? DeliveryUserId { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal DiscountTotal { get; private set; }
    public decimal DepositTotal { get; private set; }
    public Guid? AppliedPromotionId { get; private set; }
    public string? AppliedPromotionCode { get; private set; }
    public decimal Total { get; private set; }
    public int? EstimatedTravelMinutes { get; private set; }
    public int? EstimatedPreparationMinutes { get; private set; }
    public DateTime? EstimateCalculatedAtUtc { get; private set; }
    public DateTime? EstimatedDeliveryAtUtc { get; private set; }
    public bool IsDeliveryEstimateFallback { get; private set; }
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();
    public IReadOnlyCollection<OrderDeposit> Deposits => _deposits.AsReadOnly();

    public static Order Create(
        Guid storeId,
        string customerName,
        string customerPhone,
        string deliveryAddress,
        decimal? deliveryLatitude,
        decimal? deliveryLongitude,
        string? notes,
        IEnumerable<OrderItem> items,
        IEnumerable<OrderDeposit>? deposits = null,
        decimal discountTotal = 0m,
        string? appliedPromotionCode = null,
        Guid? appliedPromotionId = null)
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

        if (deliveryLatitude.HasValue != deliveryLongitude.HasValue)
        {
            throw new DomainRuleException("Delivery latitude and longitude must both be provided.");
        }

        if (deliveryLatitude is < -90 or > 90)
        {
            throw new DomainRuleException("Delivery latitude must be between -90 and 90.");
        }

        if (deliveryLongitude is < -180 or > 180)
        {
            throw new DomainRuleException("Delivery longitude must be between -180 and 180.");
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
            DeliveryLatitude = deliveryLatitude,
            DeliveryLongitude = deliveryLongitude,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            Status = OrderStatus.Pending
        };

        foreach (var item in itemList)
        {
            item.AttachToOrder(order.Id);
            order._items.Add(item);
        }

        foreach (var deposit in deposits ?? [])
        {
            deposit.AttachToOrder(order.Id);
            order._deposits.Add(deposit);
        }

        order.RecalculatePricing(discountTotal, appliedPromotionCode, appliedPromotionId);
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

    public void RecalculatePricing(decimal discountTotal, string? appliedPromotionCode, Guid? appliedPromotionId)
    {
        Subtotal = _items.Sum(item => item.Subtotal);
        DepositTotal = _deposits.Sum(deposit => deposit.Total);
        DiscountTotal = decimal.Clamp(discountTotal, 0m, Subtotal);
        AppliedPromotionCode = string.IsNullOrWhiteSpace(appliedPromotionCode) ? null : appliedPromotionCode.Trim().ToUpperInvariant();
        AppliedPromotionId = AppliedPromotionCode is null ? null : appliedPromotionId;
        Total = Subtotal + DepositTotal - DiscountTotal;
        Touch();
    }

    public void SetDeliveryEstimate(int travelMinutes, int preparationMinutes, DateTime calculatedAtUtc, bool isFallback)
    {
        if (travelMinutes < 0 || preparationMinutes < 0)
        {
            throw new DomainRuleException("Delivery estimate minutes cannot be negative.");
        }

        EstimatedTravelMinutes = travelMinutes;
        EstimatedPreparationMinutes = preparationMinutes;
        EstimateCalculatedAtUtc = DateTime.SpecifyKind(calculatedAtUtc, DateTimeKind.Utc);
        EstimatedDeliveryAtUtc = EstimateCalculatedAtUtc.Value.AddMinutes(travelMinutes + preparationMinutes);
        IsDeliveryEstimateFallback = isFallback;
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
