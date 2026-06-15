using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Promotions;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Persistence.Seed;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Banners;

public sealed class BannerIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task CreateBanner_ShouldPersistForStore()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var request = new CreateBannerRequest(
            "Happy Hour",
            "2x1 en botellas",
            "Solo por hoy",
            "2x1",
            null,
            true,
            new PromotionConfigurationRequest("Promo principal", "HAPPY2X1", PromotionType.BuyXGetY, null, 1, 1, SeedDataIds.ProductGinId));

        var response = await adminClient.PostAsJsonAsync("/api/banners", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<BannerDto>>();
        payload!.Data!.Header.Should().Be("Happy Hour");
        payload.Data.Status.Should().BeTrue();
        payload.Data.Promotion.Should().NotBeNull();
        payload.Data.Promotion!.Code.Should().Be("HAPPY2X1");
        payload.Data.Promotion.TargetProductId.Should().Be(SeedDataIds.ProductGinId);
    }

    [Fact]
    public async Task UpdateBanner_ShouldPersistTargetProductForBuyXGetYPromotion()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var createResponse = await adminClient.PostAsJsonAsync(
            "/api/banners",
            new CreateBannerRequest("Promo", "Banner base", "Descripcion", null, null, true));

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdPayload = await createResponse.Content.ReadFromJsonAsync<ApiResponse<BannerDto>>();
        var bannerId = createdPayload!.Data!.BannerId;

        var updateResponse = await adminClient.PutAsJsonAsync(
            $"/api/banners/{bannerId}",
            new UpdateBannerRequest(
                "Promo",
                "Banner 2x1",
                "Descripcion",
                null,
                null,
                true,
                new PromotionConfigurationRequest("Promo 2x1", "PROMO2X1", PromotionType.BuyXGetY, null, 1, 1, SeedDataIds.ProductGinId)));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatePayload = await updateResponse.Content.ReadFromJsonAsync<ApiResponse<BannerDto>>();
        updatePayload!.Data!.Promotion.Should().NotBeNull();
        updatePayload.Data.Promotion!.TargetProductId.Should().Be(SeedDataIds.ProductGinId);

        var getResponse = await adminClient.GetAsync("/api/banners?page=1&pageSize=20");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var getPayload = await getResponse.Content.ReadFromJsonAsync<ApiResponse<PagedResult<BannerDto>>>();
        var updatedBanner = getPayload!.Data!.Items.Single(x => x.BannerId == bannerId);
        updatedBanner.Promotion.Should().NotBeNull();
        updatedBanner.Promotion!.TargetProductId.Should().Be(SeedDataIds.ProductGinId);
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
