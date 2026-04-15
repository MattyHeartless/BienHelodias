using LiquorSaaS.Application.Common;
using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Application.Stores;

public sealed record CreateStoreRequest(string Name, string Slug, SubscriptionStatus SubscriptionStatus, string? WelcomePhrase = null);
public sealed record UpdateStoreRequest(string Name, string Slug, bool IsActive, string? WelcomePhrase = null);
public sealed record StoreDto(Guid Id, string Name, string Slug, string? WelcomePhrase, bool IsActive, SubscriptionStatus SubscriptionStatus, DateTime CreatedAtUtc);
public sealed record UpdateSubscriptionRequest(SubscriptionStatus SubscriptionStatus);

public interface IStoreService
{
    Task<StoreDto> CreateAsync(CreateStoreRequest request, CancellationToken cancellationToken);
    Task<StoreDto> UpdateAsync(Guid id, UpdateStoreRequest request, CancellationToken cancellationToken);
    Task<StoreDto> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<PagedResult<StoreDto>> ListAsync(PaginationRequest request, CancellationToken cancellationToken);
    Task<StoreDto> UpdateSubscriptionAsync(Guid id, UpdateSubscriptionRequest request, CancellationToken cancellationToken);
}
