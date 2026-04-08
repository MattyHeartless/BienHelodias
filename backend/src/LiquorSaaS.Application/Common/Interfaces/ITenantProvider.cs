namespace LiquorSaaS.Application.Common.Interfaces;

public interface ITenantProvider
{
    Guid? StoreId { get; }
    Guid GetRequiredStoreId();
}
