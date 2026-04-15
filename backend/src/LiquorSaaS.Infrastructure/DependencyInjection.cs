using LiquorSaaS.Application.Banners;
using System.Text;
using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Application.Orders;
using LiquorSaaS.Application.Products;
using LiquorSaaS.Application.Storefront;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Identity;
using LiquorSaaS.Infrastructure.Persistence;
using LiquorSaaS.Infrastructure.Persistence.Seed;
using LiquorSaaS.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace LiquorSaaS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Server=localhost;Database=LiquorSaaSDb;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=False;";

        services.AddDbContext<LiquorSaaSDbContext>(options =>
            options.UseSqlServer(connectionString, sql =>
            {
                sql.MigrationsAssembly(typeof(LiquorSaaSDbContext).Assembly.FullName);
                sql.EnableRetryOnFailure();
            }));

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddScoped<BcryptPasswordHasher>();
        services.AddScoped<IPasswordHasher>(sp => sp.GetRequiredService<BcryptPasswordHasher>());
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<DatabaseSeeder>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IStoreService, StoreService>();
        services.AddScoped<IStorefrontService, StorefrontService>();
        services.AddScoped<IBannerService, BannerService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IDeliveryService, DeliveryService>();
        services.AddScoped<IAdminService, AdminService>();

        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key));

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = key,
                    ClockSkew = TimeSpan.FromMinutes(1),
                    RoleClaimType = "role"
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequireStoreAdmin", policy => policy.RequireClaim("role", UserRole.StoreAdmin.ToString()));
            options.AddPolicy("RequireDeliveryUser", policy => policy.RequireClaim("role", UserRole.DeliveryUser.ToString()));
            options.AddPolicy("RequireSuperAdmin", policy => policy.RequireClaim("role", UserRole.SuperAdmin.ToString()));
        });

        return services;
    }
}
