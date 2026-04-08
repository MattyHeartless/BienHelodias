using LiquorSaaS.Domain.Common;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Domain.Entities;

public sealed class AppUser : AuditableEntity
{
    private AppUser()
    {
    }

    public string Name { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public Guid? StoreId { get; private set; }
    public bool IsActive { get; private set; } = true;

    public static AppUser Create(string name, string email, string passwordHash, UserRole role, Guid? storeId)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new DomainRuleException("User name, email, and password hash are required.");
        }

        if (role != UserRole.SuperAdmin && storeId is null)
        {
            throw new DomainRuleException("StoreId is required for non-super-admin users.");
        }

        return new AppUser
        {
            Name = name.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash,
            Role = role,
            StoreId = storeId,
            IsActive = true
        };
    }

    public void Update(string name, bool isActive)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainRuleException("User name is required.");
        }

        Name = name.Trim();
        IsActive = isActive;
        Touch();
    }
}
