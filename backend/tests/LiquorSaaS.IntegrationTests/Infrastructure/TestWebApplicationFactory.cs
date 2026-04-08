using System.Net.Http.Headers;
using System.Net.Http.Json;
using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Infrastructure.Persistence;
using LiquorSaaS.Infrastructure.Persistence.Seed;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LiquorSaaS.IntegrationTests.Infrastructure;

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<LiquorSaaSDbContext>));
            services.RemoveAll(typeof(LiquorSaaSDbContext));

            services.AddSingleton(_connection);
            services.AddDbContext<LiquorSaaSDbContext>((sp, options) =>
            {
                options.UseSqlite(sp.GetRequiredService<SqliteConnection>());
            });
        });
    }

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _connection.DisposeAsync();
        Dispose();
    }

    public HttpClient CreateStoreClient(Guid? storeId = null)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-Store-Id", (storeId ?? SeedDataIds.StoreId).ToString());
        return client;
    }

    public async Task<string> LoginAsync(string email, string password, Guid? storeId = null)
    {
        var client = CreateStoreClient(storeId);
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<AuthTokenDto>>();
        return payload!.Data!.AccessToken;
    }

    public async Task<HttpClient> CreateAuthorizedClientAsync(string email, string password, Guid? storeId = null)
    {
        var token = await LoginAsync(email, password, storeId);
        var client = CreateStoreClient(storeId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
