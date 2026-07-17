using FluentAssertions;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.UnitTests.Domain;

public sealed class OrderDomainTests
{
    [Fact]
    public void CreateOrder_ShouldCalculateTotalFromItems()
    {
        var items = new[]
        {
            OrderItem.Create(Guid.NewGuid(), "Gin", 45.00m, 2),
            OrderItem.Create(Guid.NewGuid(), "Tonica", 12.50m, 1)
        };

        var order = Order.Create(Guid.NewGuid(), "Cliente", "5555", "Calle 123", 19.432608m, -99.133209m, null, items);

        order.Total.Should().Be(102.50m);
        order.DeliveryLatitude.Should().Be(19.432608m);
        order.DeliveryLongitude.Should().Be(-99.133209m);
    }

    [Fact]
    public void CreateOrder_ShouldAddDepositsWithoutDiscountingThem()
    {
        var productId = Guid.NewGuid();
        var items = new[]
        {
            OrderItem.Create(productId, "Agua 20 L", 50.00m, 3, emptyContainersToExchange: 1)
        };
        var deposits = new[]
        {
            OrderDeposit.Create(productId, "Agua 20 L", ContainerDepositType.Bucket, 2, 40.00m)
        };

        var order = Order.Create(
            Guid.NewGuid(),
            "Cliente",
            "5555",
            "Calle 123",
            null,
            null,
            null,
            items,
            deposits,
            discountTotal: 15.00m);

        order.Subtotal.Should().Be(150.00m);
        order.DepositTotal.Should().Be(80.00m);
        order.DiscountTotal.Should().Be(15.00m);
        order.Total.Should().Be(215.00m);
        order.Deposits.Should().ContainSingle();
        order.Items.Single().EmptyContainersToExchange.Should().Be(1);
    }

    [Fact]
    public void UpdateStatus_ShouldAllowOnlyValidTransitions()
    {
        Order.CanTransition(OrderStatus.Pending, OrderStatus.Accepted).Should().BeTrue();
        Order.CanTransition(OrderStatus.Accepted, OrderStatus.Preparing).Should().BeTrue();
        Order.CanTransition(OrderStatus.Preparing, OrderStatus.Ready).Should().BeTrue();
        Order.CanTransition(OrderStatus.Ready, OrderStatus.OnTheWay).Should().BeTrue();
        Order.CanTransition(OrderStatus.OnTheWay, OrderStatus.Delivered).Should().BeTrue();

        Order.CanTransition(OrderStatus.Pending, OrderStatus.Ready).Should().BeFalse();
        Order.CanTransition(OrderStatus.Accepted, OrderStatus.Delivered).Should().BeFalse();
        Order.CanTransition(OrderStatus.Cancelled, OrderStatus.Pending).Should().BeFalse();
    }

    [Fact]
    public void CreateNonSuperAdminUser_WithoutStoreId_ShouldThrow()
    {
        var act = () => AppUser.Create("Admin", "admin@test.com", "hash", UserRole.StoreAdmin, null);

        act.Should().Throw<DomainRuleException>()
            .WithMessage("*StoreId is required*");
    }
}
