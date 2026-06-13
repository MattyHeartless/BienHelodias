using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Auth;

public sealed class AuthIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task Login_ShouldReturnJwtToken()
    {
        var client = factory.CreateStoreClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin@bienhelodias.local", "Admin123!", false));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<AuthTokenDto>>();
        payload!.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        payload.Data.StoreId.Should().NotBeNull();
        response.Headers.TryGetValues("Set-Cookie", out var cookies).Should().BeTrue();
        cookies!.Should().Contain(x => x.Contains("bh_delivery_session"));
    }

    [Fact]
    public async Task Refresh_ShouldWorkUsingCookieSession()
    {
        var client = factory.CreateStoreClient();
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("delivery@bienhelodias.local", "Admin123!", true));
        loginResponse.EnsureSuccessStatusCode();

        var refreshResponse = await client.PostAsync("/api/auth/refresh", null);

        refreshResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeliveryLogin_ShouldForceUnavailableAvailability()
    {
        var deliveryClient = await factory.CreateAuthorizedClientAsync("delivery@bienhelodias.local", "Admin123!");

        var response = await deliveryClient.GetAsync("/api/delivery/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<DeliveryUserDto>>();
        payload!.Data!.CurrentAvailability.Should().Be(DeliveryAvailability.Unavailable);
    }
}
