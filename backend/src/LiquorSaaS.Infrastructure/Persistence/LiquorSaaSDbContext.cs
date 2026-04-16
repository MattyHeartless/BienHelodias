using LiquorSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Persistence;

public sealed class LiquorSaaSDbContext(DbContextOptions<LiquorSaaSDbContext> options) : DbContext(options)
{
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<Banner> Banners => Set<Banner>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<DeliveryUser> DeliveryUsers => Set<DeliveryUser>();
    public DbSet<AppUser> Users => Set<AppUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Store>(entity =>
        {
            entity.ToTable("Stores");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Slug).HasMaxLength(80).IsRequired();
            entity.Property(x => x.WelcomePhrase).HasMaxLength(280);
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => x.IsActive);
            entity.Property(x => x.SubscriptionStatus).HasConversion<int>();
        });

        modelBuilder.Entity<Banner>(entity =>
        {
            entity.ToTable("Banners");
            entity.HasKey(x => x.BannerId);
            entity.Property(x => x.Header).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(1000).IsRequired();
            entity.Property(x => x.Wildcard).HasMaxLength(120);
            entity.Property(x => x.ExpirationDate).HasColumnType("datetime2");
            entity.Property(x => x.Status).IsRequired();
            entity.Property(x => x.Created).HasColumnType("datetime2");
            entity.HasIndex(x => x.StoreId);
            entity.HasOne<Store>()
                .WithMany(x => x.Banners)
                .HasForeignKey(x => x.StoreId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("Products");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(1000).IsRequired();
            entity.Property(x => x.Category).HasMaxLength(120).IsRequired();
            entity.Property(x => x.ImageUrl).HasMaxLength(500);
            entity.Property(x => x.Price).HasColumnType("decimal(18,2)");
            entity.HasIndex(x => x.StoreId);
            entity.HasIndex(x => new { x.StoreId, x.IsActive });
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CustomerName).HasMaxLength(150).IsRequired();
            entity.Property(x => x.CustomerPhone).HasMaxLength(50).IsRequired();
            entity.Property(x => x.DeliveryAddress).HasMaxLength(500).IsRequired();
            entity.Property(x => x.DeliveryLatitude).HasColumnType("decimal(9,6)");
            entity.Property(x => x.DeliveryLongitude).HasColumnType("decimal(9,6)");
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.Property(x => x.Total).HasColumnType("decimal(18,2)");
            entity.Property(x => x.Status).HasConversion<int>();
            entity.HasIndex(x => x.StoreId);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.DeliveryUserId);
            entity.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("OrderItems");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ProductNameSnapshot).HasMaxLength(160).IsRequired();
            entity.Property(x => x.UnitPrice).HasColumnType("decimal(18,2)");
            entity.Property(x => x.Subtotal).HasColumnType("decimal(18,2)");
            entity.HasIndex(x => x.OrderId);
            entity.HasIndex(x => x.ProductId);
        });

        modelBuilder.Entity<DeliveryUser>(entity =>
        {
            entity.ToTable("DeliveryUsers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Phone).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(180).IsRequired();
            entity.Property(x => x.CurrentAvailability).HasConversion<int>();
            entity.HasIndex(x => x.UserId).IsUnique();
            entity.HasIndex(x => x.StoreId);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(180).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Role).HasConversion<int>();
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.StoreId);
        });

        base.OnModelCreating(modelBuilder);
    }
}
