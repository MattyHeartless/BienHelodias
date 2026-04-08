namespace LiquorSaaS.Domain.Common;

public abstract class AuditableEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; protected set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; protected set; } = DateTime.UtcNow;

    public void Touch(DateTime? utcNow = null)
    {
        UpdatedAtUtc = utcNow ?? DateTime.UtcNow;
    }
}
