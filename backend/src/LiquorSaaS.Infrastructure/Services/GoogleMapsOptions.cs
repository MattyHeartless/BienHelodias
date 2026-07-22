namespace LiquorSaaS.Infrastructure.Services;

public sealed class GoogleMapsOptions
{
    public const string SectionName = "GoogleMaps";

    public string RoutesApiKey { get; init; } = string.Empty;
    public int PreparationMinutes { get; init; } = 10;
    public int FallbackTravelMinutes { get; init; } = 20;
}
