using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Auth;

public sealed class AuthIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task Login_ShouldReturnJwtToken()
    {
        var client = factory.CreateStoreClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin@bienhelodias.local", "Admin123!"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<AuthTokenDto>>();
        payload!.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        payload.Data.StoreId.Should().NotBeNull();
    }
}
