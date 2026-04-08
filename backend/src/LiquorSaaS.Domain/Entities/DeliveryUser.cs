using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class DeliveryUser : AuditableEntity
{
    private DeliveryUser()
    {
    }

    public Guid UserId { get; private set; }
    public Guid StoreId { get; private set; }
    public string FullName { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;
    public DeliveryAvailability CurrentAvailability { get; private set; } = DeliveryAvailability.Available;

    public static DeliveryUser Create(Guid userId, Guid storeId, string fullName, string phone, string email)
    {
        if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(email))
        {
            throw new DomainRuleException("Delivery user full name, phone, and email are required.");
        }

        return new DeliveryUser
        {
            UserId = userId,
            StoreId = storeId,
            FullName = fullName.Trim(),
            Phone = phone.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            IsActive = true,
            CurrentAvailability = DeliveryAvailability.Available
        };
    }

    public void UpdateAvailability(DeliveryAvailability availability)
    {
        CurrentAvailability = availability;
        Touch();
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        Touch();
    }
}
