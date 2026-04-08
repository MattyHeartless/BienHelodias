namespace LiquorSaaS.Infrastructure.Identity;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; init; } = "LiquorSaaS";
    public string Audience { get; init; } = "LiquorSaaS.Web";
    public string Key { get; init; } = "super-secret-development-key-change-this-now";
    public int ExpirationMinutes { get; init; } = 120;
}
