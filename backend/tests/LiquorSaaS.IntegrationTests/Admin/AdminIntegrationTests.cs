using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Common;
using LiquorSaaS.IntegrationTests.Infrastructure;
using LiquorSaaS.Infrastructure.Persistence.Seed;

namespace LiquorSaaS.IntegrationTests.Admin;

public sealed class AdminIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task GetStoreAdmins_ShouldReturnAdminsForRequestedStore()
    {
        var superAdminClient = await factory.CreateAuthorizedClientAsync("superadmin@liquorsaas.local", "Admin123!");

        var response = await superAdminClient.GetAsync($"/api/superadmin/stores/{SeedDataIds.StoreId}/admins");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<StoreAdminDto>>>();
        payload.Should().NotBeNull();
        payload!.Data.Should().NotBeNull();
        payload.Data.Should().ContainSingle();
        payload.Data[0].Email.Should().Be("admin@bienhelodias.local");
        payload.Data[0].StoreId.Should().Be(SeedDataIds.StoreId);
    }
}
