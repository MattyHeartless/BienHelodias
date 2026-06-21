using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.InventoryAi;
using LiquorSaaS.Application.Products;
using LiquorSaaS.IntegrationTests.Infrastructure;

namespace LiquorSaaS.IntegrationTests.Admin;

public sealed class InventoryAiIntegrationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task CommitInventoryChanges_ShouldAdjustStockAndCreateProducts()
    {
        var adminClient = await factory.CreateAuthorizedClientAsync("admin@bienhelodias.local", "Admin123!");
        var createResponse = await adminClient.PostAsJsonAsync("/api/products", new CreateProductRequest("Tequila Repo", "Botella base", 299m, 5, "Tequila", null));
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var createdProduct = await createResponse.Content.ReadFromJsonAsync<ApiResponse<ProductDto>>();
        var productId = createdProduct!.Data!.Id;

        var commitRequest = new CommitInventoryAiRequest(
            "scan-test-001",
            [
                new InventoryAiStockAdjustmentRequest(productId, 4, "Tequila Repo")
            ],
            [
                new InventoryAiNewProductRequest("Ron Blanco 750ml", "Detectado desde imagen", 199m, 2, "Ron", null, true, "Ron Blanco 750ml")
            ]);

        var commitResponse = await adminClient.PostAsJsonAsync("/api/admin/inventory-ai/commit", commitRequest);

        commitResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var commitPayload = await commitResponse.Content.ReadFromJsonAsync<ApiResponse<InventoryAiCommitResultDto>>();
        commitPayload!.Data!.AdjustedProductsCount.Should().Be(1);
        commitPayload.Data.CreatedProductsCount.Should().Be(1);
        commitPayload.Data.TotalUnitsAdded.Should().Be(4);

        var productsResponse = await adminClient.GetAsync("/api/products?page=1&pageSize=200");
        productsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var productsPayload = await productsResponse.Content.ReadFromJsonAsync<ApiResponse<PagedResult<ProductDto>>>();
        productsPayload!.Data!.Items.Should().Contain(item => item.Name == "Tequila Repo" && item.Stock == 9);
        productsPayload.Data.Items.Should().Contain(item => item.Name == "Ron Blanco 750ml" && item.Stock == 2);
    }
}
