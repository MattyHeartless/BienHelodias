using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.Infrastructure.Persistence.Seed;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Stores;

public sealed class StoreIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task UpdateStore_ShouldPersistOperationalFields()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var request = new UpdateStoreRequest(
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
            -100.316113m);

        var updateResponse = await adminClient.PutAsJsonAsync($"/api/stores/{SeedDataIds.StoreId}", request);

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatePayload = await updateResponse.Content.ReadFromJsonAsync<ApiResponse<StoreDto>>();
        updatePayload!.Data!.OpeningTime.Should().Be(new TimeOnly(9, 0));
        updatePayload.Data.ClosingTime.Should().Be(new TimeOnly(23, 30));
        updatePayload.Data.CartonPrice.Should().Be(599m);
        updatePayload.Data.BucketPrice.Should().Be(329m);
        updatePayload.Data.MinimumPurchase.Should().Be(250m);
        updatePayload.Data.BusinessAddress.Should().Be("Av. Benito Juarez 123, Col. Centro, 64000 Monterrey, N.L., Mexico");
        updatePayload.Data.Latitude.Should().Be(25.686614m);
        updatePayload.Data.Longitude.Should().Be(-100.316113m);

        var getResponse = await adminClient.GetAsync($"/api/stores/{SeedDataIds.StoreId}");

        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var getPayload = await getResponse.Content.ReadFromJsonAsync<ApiResponse<StoreDto>>();
        getPayload!.Data!.OpeningTime.Should().Be(new TimeOnly(9, 0));
        getPayload.Data.ClosingTime.Should().Be(new TimeOnly(23, 30));
        getPayload.Data.CartonPrice.Should().Be(599m);
        getPayload.Data.BucketPrice.Should().Be(329m);
        getPayload.Data.MinimumPurchase.Should().Be(250m);
        getPayload.Data.BusinessAddress.Should().Be("Av. Benito Juarez 123, Col. Centro, 64000 Monterrey, N.L., Mexico");
        getPayload.Data.Latitude.Should().Be(25.686614m);
        getPayload.Data.Longitude.Should().Be(-100.316113m);
    }
}
