using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Push;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Push;

public sealed class PushSubscriptionIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task DeliveryUser_ShouldRegisterQueryAndDeactivatePushSubscription()
    {
        var client = await factory.CreateAuthorizedClientAsync("delivery@bienhelodias.local", "Admin123!");
        const string endpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint";

        var registerResponse = await client.PostAsJsonAsync("/api/push-subscriptions", new RegisterPushSubscriptionRequest(
            endpoint,
            "test-p256dh",
            "test-auth",
            "IntegrationTestAgent/1.0"));

        registerResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var registerPayload = await registerResponse.Content.ReadFromJsonAsync<ApiResponse<PushSubscriptionRegistrationDto>>();
        registerPayload!.Data!.Registered.Should().BeTrue();
        registerPayload.Data.Endpoint.Should().Be(endpoint);

        var getResponse = await client.GetAsync($"/api/push-subscriptions/me?endpoint={Uri.EscapeDataString(endpoint)}");

        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var getPayload = await getResponse.Content.ReadFromJsonAsync<ApiResponse<PushSubscriptionStatusDto>>();
        getPayload!.Data!.IsActive.Should().BeTrue();
        getPayload.Data.Endpoint.Should().Be(endpoint);

        var deleteResponse = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/push-subscriptions/current")
        {
            Content = JsonContent.Create(new DeletePushSubscriptionRequest(endpoint))
        });

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var afterDeleteResponse = await client.GetAsync($"/api/push-subscriptions/me?endpoint={Uri.EscapeDataString(endpoint)}");
        var afterDeletePayload = await afterDeleteResponse.Content.ReadFromJsonAsync<ApiResponse<PushSubscriptionStatusDto>>();
        afterDeletePayload!.Data!.IsActive.Should().BeFalse();
    }
}
