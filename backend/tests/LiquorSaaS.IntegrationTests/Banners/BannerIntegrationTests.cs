using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Banners;

public sealed class BannerIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task CreateBanner_ShouldPersistForStore()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var request = new CreateBannerRequest("Happy Hour", "2x1 en botellas", "Solo por hoy", "2x1", null, true);

        var response = await adminClient.PostAsJsonAsync("/api/banners", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<BannerDto>>();
        payload!.Data!.Header.Should().Be("Happy Hour");
        payload.Data.Status.Should().BeTrue();
    }

    [Fact]
    public async Task ActiveBanners_ShouldBeFilteredByTenantAndVisibility()
    {
        var superAdmin = await factory.CreateAuthorizedClientAsync("superadmin@liquorsaas.local", "Admin123!");
        var createStoreResponse = await superAdmin.PostAsJsonAsync("/api/stores", new CreateStoreRequest("Store 2", "store-2", LiquorSaaS.Domain.Enums.SubscriptionStatus.Active));
        createStoreResponse.EnsureSuccessStatusCode();
        var storePayload = await createStoreResponse.Content.ReadFromJsonAsync<ApiResponse<StoreDto>>();
        var secondStoreId = storePayload!.Data!.Id;

        superAdmin.DefaultRequestHeaders.Remove("X-Store-Id");
        superAdmin.DefaultRequestHeaders.Add("X-Store-Id", secondStoreId.ToString());
        var createBannerResponse = await superAdmin.PostAsJsonAsync("/api/banners", new CreateBannerRequest("Store 2", "Banner visible", "Solo segunda tienda", null, null, true));
        createBannerResponse.EnsureSuccessStatusCode();

        var publicClient = factory.CreateStoreClient();
        var bannersResponse = await publicClient.GetAsync("/api/banners/active");

        bannersResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await bannersResponse.Content.ReadFromJsonAsync<ApiResponse<PagedResult<BannerDto>>>();
        payload!.Data!.Items.Should().NotContain(x => x.StoreId == secondStoreId);
    }
}
