using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Orders;
using LiquorSaaS.Application.Promotions;
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
            19.432608m,
            -99.133209m,
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
        payload.Data.DeliveryLatitude.Should().Be(19.432608m);
        payload.Data.DeliveryLongitude.Should().Be(-99.133209m);
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
        await deliveryClient.PatchAsJsonAsync("/api/delivery/availability", new { availability = (int)DeliveryAvailability.Available });

        var response = await deliveryClient.PostAsync($"/api/orders/{orderId}/take", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<OrderDto>>();
        payload!.Data!.Status.Should().Be(OrderStatus.OnTheWay);
        payload.Data.DeliveryUserId.Should().NotBeNull();
    }

    [Fact]
    public async Task TakeOrder_ShouldAllowMultipleOrdersWhileAvailable()
    {
        var firstOrderId = await CreateOrderAsync();
        var secondOrderId = await CreateOrderAsync();
        var deliveryClient = await factory.CreateAuthorizedClientAsync("delivery@bienhelodias.local", "Admin123!");
        await deliveryClient.PatchAsJsonAsync("/api/delivery/availability", new { availability = (int)DeliveryAvailability.Available });

        var firstResponse = await deliveryClient.PostAsync($"/api/orders/{firstOrderId}/take", null);
        var secondResponse = await deliveryClient.PostAsync($"/api/orders/{secondOrderId}/take", null);

        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetMine_ShouldExcludeDeliveredOrders()
    {
        var orderId = await CreateOrderAsync();
        var deliveryClient = await factory.CreateAuthorizedClientAsync("delivery@bienhelodias.local", "Admin123!");
        await deliveryClient.PatchAsJsonAsync("/api/delivery/availability", new { availability = (int)DeliveryAvailability.Available });
        await deliveryClient.PostAsync($"/api/orders/{orderId}/take", null);
        await deliveryClient.PatchAsJsonAsync($"/api/orders/{orderId}/status", new UpdateOrderStatusRequest(OrderStatus.Delivered));

        var response = await deliveryClient.GetAsync("/api/delivery/orders/mine");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<PagedResult<OrderDto>>>();
        payload!.Data!.Items.Should().NotContain(x => x.Id == orderId);
    }

    [Fact]
    public async Task CreateOrder_ShouldApplyPercentagePromotion()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        await adminClient.PostAsJsonAsync(
            "/api/banners",
            new LiquorSaaS.Application.Banners.CreateBannerRequest(
                "Promo",
                "Descuento tienda",
                "Ahorra en tu pedido",
                "20% OFF",
                null,
                true,
                new PromotionConfigurationRequest("Descuento 20", "SAVE20", PromotionType.Percentage, 20m, null, null)));

        var client = factory.CreateStoreClient();
        var request = new CreateOrderRequest(
            SeedDataIds.StoreId,
            "Cliente Test",
            "55555",
            "Av Principal 123",
            19.432608m,
            -99.133209m,
            null,
            new[]
            {
                new CreateOrderItemRequest(SeedDataIds.ProductGinId, 1),
                new CreateOrderItemRequest(SeedDataIds.ProductTonicId, 2)
            },
            "SAVE20");

        var response = await client.PostAsJsonAsync("/api/orders", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<OrderDto>>();
        payload!.Data!.Subtotal.Should().Be(70m);
        payload.Data.DiscountTotal.Should().Be(14m);
        payload.Data.Total.Should().Be(56m);
        payload.Data.AppliedPromotionCode.Should().Be("SAVE20");
    }

    [Fact]
    public async Task ValidatePromotion_ShouldPreviewBuyXGetYDiscount()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        await adminClient.PostAsJsonAsync(
            "/api/banners",
            new LiquorSaaS.Application.Banners.CreateBannerRequest(
                "Promo",
                "2x1",
                "Doble botella",
                "2x1",
                null,
                true,
                new PromotionConfigurationRequest("Dos por uno", "DOSXUNO", PromotionType.BuyXGetY, null, 1, 1)));

        var client = factory.CreateStoreClient();
        var response = await client.PostAsJsonAsync(
            "/api/promotions/validate",
            new ValidatePromotionRequest(
                SeedDataIds.StoreId,
                "dosxuno",
                new[]
                {
                    new ValidatePromotionItemRequest(SeedDataIds.ProductGinId, 2)
                }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<PromotionValidationDto>>();
        payload!.Data!.DiscountTotal.Should().Be(45m);
        payload.Data.Total.Should().Be(45m);
        payload.Data.Code.Should().Be("DOSXUNO");
    }

    private async Task<Guid> CreateOrderAsync()
    {
        var client = factory.CreateStoreClient();
        var request = new CreateOrderRequest(
            SeedDataIds.StoreId,
            "Cliente Test",
            "55555",
            "Av Principal 123",
            19.432608m,
            -99.133209m,
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
