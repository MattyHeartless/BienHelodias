using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using LiquorSaaS.Application.Orders;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class GoogleRoutesService(
    HttpClient httpClient,
    IOptions<GoogleMapsOptions> options,
    ILogger<GoogleRoutesService> logger) : IRouteDurationService
{
    private const string ComputeRoutesUrl = "directions/v2:computeRoutes";
    private readonly GoogleMapsOptions googleMapsOptions = options.Value;

    public async Task<RouteDuration?> GetDrivingDurationAsync(
        decimal originLatitude,
        decimal originLongitude,
        decimal destinationLatitude,
        decimal destinationLongitude,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(googleMapsOptions.RoutesApiKey))
        {
            logger.LogWarning("Google Routes API key is not configured; using the delivery estimate fallback.");
            return null;
        }

        var request = new HttpRequestMessage(HttpMethod.Post, ComputeRoutesUrl)
        {
            Content = JsonContent.Create(new
            {
                origin = CreateWaypoint(originLatitude, originLongitude),
                destination = CreateWaypoint(destinationLatitude, destinationLongitude),
                travelMode = "DRIVE",
                routingPreference = "TRAFFIC_AWARE",
                departureTime = DateTimeOffset.UtcNow.ToString("O", CultureInfo.InvariantCulture)
            })
        };
        request.Headers.Add("X-Goog-Api-Key", googleMapsOptions.RoutesApiKey);
        request.Headers.Add("X-Goog-FieldMask", "routes.duration,routes.distanceMeters");

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Google Routes returned {StatusCode}; using the delivery estimate fallback.", (int)response.StatusCode);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var routes = document.RootElement.GetProperty("routes");
            if (routes.GetArrayLength() == 0)
            {
                logger.LogWarning("Google Routes returned no route; using the delivery estimate fallback.");
                return null;
            }

            var route = routes[0];
            var duration = route.GetProperty("duration").GetString();
            if (!TryGetTravelMinutes(duration, out var travelMinutes))
            {
                logger.LogWarning("Google Routes returned an invalid duration; using the delivery estimate fallback.");
                return null;
            }

            var distanceMeters = route.TryGetProperty("distanceMeters", out var distance)
                ? distance.GetInt32()
                : 0;

            return new RouteDuration(travelMinutes, distanceMeters);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Google Routes request failed; using the delivery estimate fallback.");
            return null;
        }
    }

    private static object CreateWaypoint(decimal latitude, decimal longitude) => new
    {
        location = new
        {
            latLng = new
            {
                latitude = latitude,
                longitude = longitude
            }
        }
    };

    private static bool TryGetTravelMinutes(string? duration, out int travelMinutes)
    {
        travelMinutes = 0;
        if (string.IsNullOrWhiteSpace(duration)
            || !duration.EndsWith('s')
            || !double.TryParse(duration[..^1], NumberStyles.Float, CultureInfo.InvariantCulture, out var totalSeconds)
            || totalSeconds < 0)
        {
            return false;
        }

        travelMinutes = Math.Max(1, (int)Math.Ceiling(totalSeconds / 60));
        return true;
    }
}
