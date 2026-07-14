using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Banners;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.Application.Storefront;
using LiquorSaaS.Domain.Enums;
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
            new UpdateStoreRequest(
                "Bien Helodias Centro",
                "bien-helodias-centro",
                true,
                "Entrega express y promos del dia.",
                new TimeOnly(9, 0),
                new TimeOnly(23, 30),
                599m,
                329m,
                250m,
                "Av. Benito Juarez 123, Col. Centro, 64000 Monterrey, N.L., Mexico",
                25.686614m,
                -100.316113m));
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

    [Fact]
    public async Task GetStoreBySlug_ShouldReturnOperationalStoreInfo()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var updateStoreResponse = await adminClient.PutAsJsonAsync(
            $"/api/stores/{SeedDataIds.StoreId}",
            new UpdateStoreRequest(
                "Bien Helodias Centro",
                "bien-helodias-centro",
                true,
                "Entrega express y promos del dia.",
                new TimeOnly(9, 0),
                new TimeOnly(23, 30),
                599m,
                329m,
                250m,
                "Av. Benito Juarez 123, Col. Centro, 64000 Monterrey, N.L., Mexico",
                25.686614m,
                -100.316113m));
        updateStoreResponse.EnsureSuccessStatusCode();

        var publicClient = factory.CreateStoreClient();

        var response = await publicClient.GetAsync("/api/storefront/stores/bien-helodias-centro");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<StorefrontStoreDto>>();
        payload!.Data!.OpeningTime.Should().Be(new TimeOnly(9, 0));
        payload.Data.ClosingTime.Should().Be(new TimeOnly(23, 30));
        payload.Data.CartonPrice.Should().Be(599m);
        payload.Data.BucketPrice.Should().Be(329m);
        payload.Data.MinimumPurchase.Should().Be(250m);
        payload.Data.BusinessAddress.Should().Be("Av. Benito Juarez 123, Col. Centro, 64000 Monterrey, N.L., Mexico");
        payload.Data.Latitude.Should().Be(25.686614m);
        payload.Data.Longitude.Should().Be(-100.316113m);
    }

    [Fact]
    public async Task ListStores_WithoutLocation_ShouldReturnActiveStores()
    {
        var superAdminClient = await factory.CreateAuthorizedClientAsync("superadmin@liquorsaas.local", "Admin123!");
        await superAdminClient.PutAsJsonAsync(
            $"/api/stores/{SeedDataIds.StoreId}",
            new UpdateStoreRequest(
                "Bien Helodias Centro",
                "bien-helodias-centro",
                true,
                "Entrega express y promos del dia.",
                new TimeOnly(9, 0),
                new TimeOnly(23, 30),
                599m,
                329m,
                250m,
                "Av. Benito Juarez 123, Col. Centro, 64000 Monterrey, N.L., Mexico",
                25.686614m,
                -100.316113m));

        var createStoreResponse = await superAdminClient.PostAsJsonAsync(
            "/api/stores",
            new CreateStoreRequest("Bien Helodias Sur", "bien-helodias-sur", SubscriptionStatus.Active));
        createStoreResponse.EnsureSuccessStatusCode();
        var createStorePayload = await createStoreResponse.Content.ReadFromJsonAsync<ApiResponse<StoreDto>>();
        var secondStoreId = createStorePayload!.Data!.Id;

        await superAdminClient.PutAsJsonAsync(
            $"/api/stores/{secondStoreId}",
            new UpdateStoreRequest(
                "Bien Helodias Sur",
                "bien-helodias-sur",
                true,
                "Pide rapido en la zona sur.",
                new TimeOnly(10, 0),
                new TimeOnly(22, 0),
                620m,
                350m,
                300m,
                "Av. Revolucion 500, Monterrey, N.L., Mexico",
                25.650001m,
                -100.289999m));

        var publicClient = factory.CreateClient();
        var response = await publicClient.GetAsync("/api/storefront/stores");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<StorefrontStoreListItemDto>>>();
        payload!.Data!.Should().Contain(x => x.Slug == "bien-helodias-centro");
        payload.Data.Should().Contain(x => x.Slug == "bien-helodias-sur");
        payload.Data.Should().OnlyContain(x => x.DistanceKm == null);
    }

    [Fact]
    public async Task ListStores_WithLocation_ShouldReturnStoresOrderedByDistance()
    {
        var superAdminClient = await factory.CreateAuthorizedClientAsync("superadmin@liquorsaas.local", "Admin123!");
        await superAdminClient.PutAsJsonAsync(
            $"/api/stores/{SeedDataIds.StoreId}",
            new UpdateStoreRequest(
                "Bien Helodias Centro",
                "bien-helodias-centro",
                true,
                "Entrega express y promos del dia.",
                new TimeOnly(9, 0),
                new TimeOnly(23, 30),
                599m,
                329m,
                250m,
                "Av. Benito Juarez 123, Col. Centro, 64000 Monterrey, N.L., Mexico",
                25.686614m,
                -100.316113m));

        var createStoreResponse = await superAdminClient.PostAsJsonAsync(
            "/api/stores",
            new CreateStoreRequest("Bien Helodias Valle", "bien-helodias-valle", SubscriptionStatus.Active));
        createStoreResponse.EnsureSuccessStatusCode();
        var createStorePayload = await createStoreResponse.Content.ReadFromJsonAsync<ApiResponse<StoreDto>>();
        var secondStoreId = createStorePayload!.Data!.Id;

        await superAdminClient.PutAsJsonAsync(
            $"/api/stores/{secondStoreId}",
            new UpdateStoreRequest(
                "Bien Helodias Valle",
                "bien-helodias-valle",
                true,
                "Pide rapido en valle.",
                new TimeOnly(10, 0),
                new TimeOnly(22, 0),
                620m,
                350m,
                300m,
                "Av. Gomez Morin 1000, San Pedro Garza Garcia, N.L., Mexico",
                25.651700m,
                -100.358500m));

        var publicClient = factory.CreateClient();
        var response = await publicClient.GetAsync("/api/storefront/stores?latitude=25.6520&longitude=-100.3580");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<StorefrontStoreListItemDto>>>();
        payload!.Data!.Count.Should().BeGreaterThanOrEqualTo(2);
        payload.Data[0].Slug.Should().Be("bien-helodias-valle");
        payload.Data[0].DistanceKm.Should().NotBeNull();
        payload.Data[1].Slug.Should().Be("bien-helodias-centro");
    }
}
