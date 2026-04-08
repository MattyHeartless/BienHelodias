using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Orders;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Persistence.Seed;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Orders;

public sealed class OrderIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task CreateOrder_ShouldCalculateTotalInBackend()
    {
        var client = factory.CreateStoreClient();
        var request = new CreateOrderRequest(
            SeedDataIds.StoreId,
            "Cliente Test",
            "55555",
            "Av Principal 123",
            "Sin hielo",
            new[]
            {
                new CreateOrderItemRequest(SeedDataIds.ProductGinId, 1),
                new CreateOrderItemRequest(SeedDataIds.ProductTonicId, 2)
            });

        var response = await client.PostAsJsonAsync("/api/orders", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<OrderDto>>();
        payload!.Data!.Total.Should().Be(70m);
        payload.Data.Status.Should().Be(OrderStatus.Pending);
    }

    [Fact]
    public async Task StoreAdmin_ShouldProgressOrderStatus()
    {
        var orderId = await CreateOrderAsync();
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");

        foreach (var status in new[] { OrderStatus.Accepted, OrderStatus.Preparing, OrderStatus.Ready })
        {
            var response = await adminClient.PatchAsJsonAsync($"/api/orders/{orderId}/status", new UpdateOrderStatusRequest(status));
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        var orderResponse = await adminClient.GetAsync($"/api/orders/{orderId}");
        var payload = await orderResponse.Content.ReadFromJsonAsync<ApiResponse<OrderDto>>();
        payload!.Data!.Status.Should().Be(OrderStatus.Ready);
    }

    [Fact]
    public async Task TakeOrder_ShouldSucceedForDeliveryUser()
    {
        var orderId = await CreateOrderAsync();
        var deliveryClient = await factory.CreateAuthorizedClientAsync("delivery@bienhelodias.local", "Admin123!");

        var response = await deliveryClient.PostAsync($"/api/orders/{orderId}/take", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<OrderDto>>();
        payload!.Data!.Status.Should().Be(OrderStatus.OnTheWay);
        payload.Data.DeliveryUserId.Should().NotBeNull();
    }

    private async Task<Guid> CreateOrderAsync()
    {
        var client = factory.CreateStoreClient();
        var request = new CreateOrderRequest(
            SeedDataIds.StoreId,
            "Cliente Test",
            "55555",
            "Av Principal 123",
            null,
            new[]
            {
                new CreateOrderItemRequest(SeedDataIds.ProductGinId, 1)
            });

        var response = await client.PostAsJsonAsync("/api/orders", request);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<OrderDto>>();
        return payload!.Data!.Id;
    }
}
