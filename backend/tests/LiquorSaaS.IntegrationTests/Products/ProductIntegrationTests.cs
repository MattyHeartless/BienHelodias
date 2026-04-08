using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Products;
using LiquorSaaS.Application.Stores;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Products;

public sealed class ProductIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task CreateProduct_ShouldPersistForStore()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var request = new CreateProductRequest("Mezcal Joven", "Lote de prueba", 88.5m, 20, "Mezcal", null);

        var response = await adminClient.PostAsJsonAsync("/api/products", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<ProductDto>>();
        payload!.Data!.Name.Should().Be("Mezcal Joven");
        payload.Data.Price.Should().Be(88.5m);
    }

    [Fact]
    public async Task Products_ShouldBeFilteredByTenant()
    {
        var superAdmin = await factory.CreateAuthorizedClientAsync("superadmin@liquorsaas.local", "Admin123!");
        var createStoreResponse = await superAdmin.PostAsJsonAsync("/api/stores", new CreateStoreRequest("Store 2", "store-2", LiquorSaaS.Domain.Enums.SubscriptionStatus.Active));
        createStoreResponse.EnsureSuccessStatusCode();
        var storePayload = await createStoreResponse.Content.ReadFromJsonAsync<ApiResponse<StoreDto>>();
        var secondStoreId = storePayload!.Data!.Id;

        superAdmin.DefaultRequestHeaders.Remove("X-Store-Id");
        superAdmin.DefaultRequestHeaders.Add("X-Store-Id", secondStoreId.ToString());
        var createProductResponse = await superAdmin.PostAsJsonAsync("/api/products", new CreateProductRequest("Producto Store 2", "Solo segunda tienda", 30m, 10, "Test", null));
        createProductResponse.EnsureSuccessStatusCode();

        var storeAdmin = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var productsResponse = await storeAdmin.GetAsync("/api/products");

        productsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await productsResponse.Content.ReadFromJsonAsync<ApiResponse<PagedResult<ProductDto>>>();
        payload!.Data!.Items.Should().OnlyContain(x => x.StoreId != secondStoreId);
    }
}
