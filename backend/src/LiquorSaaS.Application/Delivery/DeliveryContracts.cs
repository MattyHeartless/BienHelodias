using LiquorSaaS.Application.Common;
using LiquorSaaS.Domain.Enums;

namespace LiquorSaaS.Application.Delivery;

public sealed record UpdateAvailabilityRequest(DeliveryAvailability Availability);

public sealed record DeliveryUserDto(
    Guid Id,
    Guid UserId,
    Guid StoreId,
    string FullName,
    string Phone,
    string Email,
    bool IsActive,
    DeliveryAvailability CurrentAvailability);

public interface IDeliveryService
{
    Task<PagedResult<Orders.OrderDto>> GetAvailableOrdersAsync(PaginationRequest request, CancellationToken cancellationToken);
    Task<PagedResult<Orders.OrderDto>> GetMineAsync(PaginationRequest request, CancellationToken cancellationToken);
    Task<DeliveryUserDto> UpdateAvailabilityAsync(UpdateAvailabilityRequest request, CancellationToken cancellationToken);
}
