using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.Application.Storefront;
using LiquorSaaS.IntegrationTests.Infrastructure;
using LiquorSaaS.Infrastructure.Persistence.Seed;

namespace LiquorSaaS.IntegrationTests.Storefront;

public sealed class StorefrontIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task GetContent_ShouldReturnWelcomePhraseAndActiveBannersForTenant()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var updateStoreResponse = await adminClient.PutAsJsonAsync(
            $"/api/stores/{SeedDataIds.StoreId}",
            new UpdateStoreRequest("Bien Helodias Centro", "bien-helodias-centro", true, "Entrega express y promos del dia."));
        updateStoreResponse.EnsureSuccessStatusCode();

        var createBannerResponse = await adminClient.PostAsJsonAsync(
            "/api/banners",
            new CreateBannerRequest("Happy Hour", "2x1 en botellas", "Solo por hoy", "2x1", null, true));
        createBannerResponse.EnsureSuccessStatusCode();

        var publicClient = factory.CreateStoreClient();
        var response = await publicClient.GetAsync("/api/storefront/content");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<StorefrontContentDto>>();
        payload!.Data!.WelcomePhrase.Should().Be("Entrega express y promos del dia.");
        payload.Data.Banners.Should().Contain(x => x.Header == "Happy Hour");
    }
}
