using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace LiquorSaaS.Infrastructure.Persistence.Seed;

public sealed class DatabaseSeeder(LiquorSaaSDbContext dbContext, BcryptPasswordHasher passwordHasher)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await dbContext.Stores.AnyAsync(cancellationToken))
        {
            return;
        }

        var store = Store.Create("Bien Helodias Centro", "bien-helodias-centro", SubscriptionStatus.Active);
        SetId(store, SeedDataIds.StoreId);

        var superAdmin = AppUser.Create("Super Admin", "superadmin@liquorsaas.local", passwordHasher.HashPassword("Admin123!"), UserRole.SuperAdmin, null);
        SetId(superAdmin, SeedDataIds.SuperAdminUserId);

        var storeAdmin = AppUser.Create("Store Admin", "admin@bienhelodias.local", passwordHasher.HashPassword("Admin123!"), UserRole.StoreAdmin, store.Id);
        SetId(storeAdmin, SeedDataIds.StoreAdminUserId);

        var deliveryAppUser = AppUser.Create("Delivery Rider", "delivery@bienhelodias.local", passwordHasher.HashPassword("Admin123!"), UserRole.DeliveryUser, store.Id);
        SetId(deliveryAppUser, SeedDataIds.DeliveryAppUserId);

        var deliveryUser = DeliveryUser.Create(deliveryAppUser.Id, store.Id, "Delivery Rider", "+520000000000", deliveryAppUser.Email);
        SetId(deliveryUser, SeedDataIds.DeliveryProfileId);
        deliveryUser.UpdateAvailability(DeliveryAvailability.Available);

        var gin = Product.Create(store.Id, "Gin Botanico Premium", "Gin premium para catalogo inicial", 45.00m, 50, "Gin", null);
        SetId(gin, SeedDataIds.ProductGinId);

        var tonic = Product.Create(store.Id, "Tonica Artesanal x4", "Pack inicial para seed", 12.50m, 100, "Mixers", null);
        SetId(tonic, SeedDataIds.ProductTonicId);

        await dbContext.Stores.AddAsync(store, cancellationToken);
        await dbContext.Users.AddRangeAsync([superAdmin, storeAdmin, deliveryAppUser], cancellationToken);
        await dbContext.DeliveryUsers.AddAsync(deliveryUser, cancellationToken);
        await dbContext.Products.AddRangeAsync([gin, tonic], cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static void SetId<T>(T entity, Guid value)
    {
        var property = typeof(T).GetProperty("Id", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Entity does not expose an Id property.");

        property.SetValue(entity, value);
    }
}
