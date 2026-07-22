namespace LiquorSaaS.Application.Orders;

public sealed record RouteDuration(int TravelMinutes, int DistanceMeters);

public interface IRouteDurationService
{
    Task<RouteDuration?> GetDrivingDurationAsync(
        decimal originLatitude,
        decimal originLongitude,
        decimal destinationLatitude,
        decimal destinationLongitude,
        CancellationToken cancellationToken);
}
