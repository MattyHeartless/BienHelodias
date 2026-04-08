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

        var order = Order.Create(Guid.NewGuid(), "Cliente", "5555", "Calle 123", null, items);

        order.Total.Should().Be(102.50m);
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
