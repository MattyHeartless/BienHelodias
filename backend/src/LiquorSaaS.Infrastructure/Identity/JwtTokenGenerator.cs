using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LiquorSaaS.Infrastructure.Identity;

public sealed class JwtTokenGenerator(IOptions<JwtOptions> options) : IJwtTokenGenerator
{
    private readonly JwtOptions _options = options.Value;

    public AuthTokenDto Generate(AppUser user, Guid? deliveryUserId = null)
    {
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_options.ExpirationMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("role", user.Role.ToString())
        };

        if (user.StoreId.HasValue)
        {
            claims.Add(new Claim("storeId", user.StoreId.Value.ToString()));
        }

        if (deliveryUserId.HasValue)
        {
            claims.Add(new Claim("deliveryUserId", deliveryUserId.Value.ToString()));
        }

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new AuthTokenDto(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAtUtc,
            user.Id,
            user.Email,
            user.Role,
            user.StoreId,
            deliveryUserId);
    }
}
