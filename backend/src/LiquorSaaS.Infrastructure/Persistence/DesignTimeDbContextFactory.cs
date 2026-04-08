using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LiquorSaaS.Infrastructure.Persistence;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<LiquorSaaSDbContext>
{
    public LiquorSaaSDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<LiquorSaaSDbContext>();
        optionsBuilder.UseSqlServer(
            "Server=localhost;Database=LiquorSaaSDb;User Id=sa;Password=Test123!;TrustServerCertificate=True;Encrypt=False;");

        return new LiquorSaaSDbContext(optionsBuilder.Options);
    }
}
