using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Orders;
using LiquorSaaS.Application.Promotions;
using LiquorSaaS.Application.Push;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Domain.Exceptions;
using LiquorSaaS.Infrastructure.Extensions;
using LiquorSaaS.Infrastructure.Mapping;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class OrderService(
    LiquorSaaSDbContext dbContext,
    ITenantProvider tenantProvider,
    ICurrentUserService currentUserService,
    IPromotionService promotionService,
    IPushNotificationService pushNotificationService,
    ILogger<OrderService> logger) : IOrderService
{
    public async Task<OrderDto> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var storeId = request.StoreId;
        var store = await dbContext.Stores.AsNoTracking().SingleOrDefaultAsync(x => x.Id == storeId, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        if (!store.IsActive)
        {
            throw new ConflictException("Store is not active.");
        }

        if (request.Items.Count == 0)
        {
            throw new AppValidationException("At least one item is required.");
        }

        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToArray();
        var products = await dbContext.Products.AsNoTracking()
            .Where(x => x.StoreId == storeId && productIds.Contains(x.Id) && x.IsActive)
            .ToListAsync(cancellationToken);

        if (products.Count != productIds.Length)
        {
            throw new AppValidationException("One or more products do not exist for this store.");
        }

        var orderItems = request.Items.Select(itemRequest =>
        {
            var product = products.Single(x => x.Id == itemRequest.ProductId);
            if (itemRequest.Quantity <= 0)
            {
                throw new AppValidationException("Quantity must be greater than zero.");
            }

            if (product.Stock < itemRequest.Quantity)
            {
                throw new ConflictException($"Not enough stock for product {product.Name}.");
            }

            return OrderItem.Create(product.Id, product.Name, product.Price, itemRequest.Quantity);
        }).ToArray();

        var promotion = await promotionService.EvaluateAsync(
            storeId,
            request.PromoCode,
            orderItems.Select(item => new PromotionCartItemRequest(item.ProductId, item.UnitPrice, item.Quantity)).ToArray(),
            cancellationToken);

        var order = Order.Create(
            storeId,
            request.CustomerName,
            request.CustomerPhone,
            request.DeliveryAddress,
            request.DeliveryLatitude,
            request.DeliveryLongitude,
            request.Notes,
            orderItems,
            promotion?.DiscountTotal ?? 0m,
            promotion?.Code,
            promotion?.PromotionId);

        await dbContext.Orders.AddAsync(order, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Order {OrderId} created for store {StoreId}", order.Id, storeId);

        try
        {
            await pushNotificationService.NotifyNewOrderAsync(order.Id, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Push notification dispatch failed for order {OrderId}", order.Id);
        }

        return order.ToDto();
    }

    public async Task<OrderDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders.AsNoTracking()
            .Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Order not found.");

        EnsureOrderAccess(order);
        return await MapOrderAsync(order, cancellationToken);
    }

    public async Task<OrderDto> GetTrackingByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var storeId = tenantProvider.GetRequiredStoreId();
        var order = await dbContext.Orders.AsNoTracking()
            .Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.Id == id && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Order not found.");

        return await MapOrderAsync(order, cancellationToken);
    }

    public async Task<PagedResult<OrderDto>> GetStoreOrdersAsync(PaginationRequest request, OrderStatus? status, string? search, CancellationToken cancellationToken)
    {
        EnsureStoreScopedRole();
        var storeId = tenantProvider.GetRequiredStoreId();

        var query = dbContext.Orders.AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.StoreId == storeId);

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        var normalizedSearch = search?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            var likePattern = $"%{EscapeLikePattern(normalizedSearch)}%";
            var hasOrderId = Guid.TryParse(normalizedSearch, out var orderId);

            query = query.Where(x =>
                (hasOrderId && x.Id == orderId) ||
                EF.Functions.Like(x.CustomerName, likePattern) ||
                EF.Functions.Like(x.CustomerPhone, likePattern) ||
                EF.Functions.Like(x.DeliveryAddress, likePattern) ||
                (x.Notes != null && EF.Functions.Like(x.Notes, likePattern)) ||
                (x.AppliedPromotionCode != null && EF.Functions.Like(x.AppliedPromotionCode, likePattern)) ||
                x.Items.Any(item => EF.Functions.Like(item.ProductNameSnapshot, likePattern)));
        }

        var paged = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToPagedResultAsync(request, cancellationToken);

        var items = await MapOrdersAsync(paged.Items, cancellationToken);

        return new PagedResult<OrderDto>
        {
            Page = paged.Page,
            PageSize = paged.PageSize,
            Total = paged.Total,
            Items = items
        };
    }

    private static string EscapeLikePattern(string value)
    {
        return value
            .Replace("[", "[[]", StringComparison.Ordinal)
            .Replace("%", "[%]", StringComparison.Ordinal)
            .Replace("_", "[_]", StringComparison.Ordinal);
    }

    public async Task<OrderDto> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request, CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders.Include(x => x.Items).SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Order not found.");

        EnsureOrderMutationAccess(order);

        if (currentUserService.Role == UserRole.DeliveryUser)
        {
            var deliveryUser = await GetCurrentDeliveryUserAsync(cancellationToken);
            if (order.DeliveryUserId != deliveryUser.Id)
            {
                throw new ForbiddenException("You can only update your assigned orders.");
            }

            if (request.Status != OrderStatus.Delivered)
            {
                throw new ForbiddenException("Delivery users can only mark their orders as delivered.");
            }
        }

        try
        {
            order.UpdateStatus(request.Status);
        }
        catch (DomainRuleException ex)
        {
            throw new ConflictException(ex.Message);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Order {OrderId} changed status to {Status}", order.Id, order.Status);
        return await MapOrderAsync(order, cancellationToken);
    }

    public async Task<OrderDto> TakeAsync(Guid id, CancellationToken cancellationToken)
    {
        if (currentUserService.Role != UserRole.DeliveryUser)
        {
            throw new ForbiddenException("Only delivery users can take orders.");
        }

        var deliveryUser = await GetCurrentDeliveryUserAsync(cancellationToken);
        if (!deliveryUser.IsActive || deliveryUser.CurrentAvailability != DeliveryAvailability.Available)
        {
            throw new ConflictException("Delivery user is not available.");
        }

        var storeId = tenantProvider.GetRequiredStoreId();
        var now = DateTime.UtcNow;

        await dbContext.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            var affectedRows = await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE Orders
SET DeliveryUserId = {deliveryUser.Id},
    Status = {(int)OrderStatus.OnTheWay},
    UpdatedAtUtc = {now}
WHERE Id = {id}
  AND StoreId = {storeId}
  AND DeliveryUserId IS NULL
  AND Status = {(int)OrderStatus.Pending};", cancellationToken);

            if (affectedRows == 0)
            {
                logger.LogWarning("Delivery user {DeliveryUserId} hit a take-order concurrency conflict on order {OrderId}", deliveryUser.Id, id);
                throw new ConflictException("Order is no longer available.");
            }
        });

        logger.LogInformation("Order {OrderId} was taken by delivery user {DeliveryUserId}", id, deliveryUser.Id);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<OrderDto> ReleaseAsync(Guid id, CancellationToken cancellationToken)
    {
        if (currentUserService.Role is not (UserRole.DeliveryUser or UserRole.StoreAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Only delivery users, store admins, or super admins can release orders.");
        }

        var storeId = tenantProvider.GetRequiredStoreId();
        var deliveryUser = currentUserService.Role == UserRole.DeliveryUser
            ? await GetCurrentDeliveryUserAsync(cancellationToken)
            : null;
        var now = DateTime.UtcNow;

        await dbContext.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            int affectedRows;
            if (deliveryUser is not null)
            {
                affectedRows = await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE Orders
SET DeliveryUserId = NULL,
    Status = {(int)OrderStatus.Pending},
    UpdatedAtUtc = {now}
WHERE Id = {id}
  AND StoreId = {storeId}
  AND DeliveryUserId = {deliveryUser.Id}
  AND Status = {(int)OrderStatus.OnTheWay};", cancellationToken);
            }
            else
            {
                affectedRows = await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE Orders
SET DeliveryUserId = NULL,
    Status = {(int)OrderStatus.Pending},
    UpdatedAtUtc = {now}
WHERE Id = {id}
  AND StoreId = {storeId}
  AND DeliveryUserId IS NOT NULL
  AND Status = {(int)OrderStatus.OnTheWay};", cancellationToken);
            }

            if (affectedRows == 0)
            {
                throw new ConflictException("Order could not be released.");
            }

            await transaction.CommitAsync(cancellationToken);
        });

        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task<DeliveryUser> GetCurrentDeliveryUserAsync(CancellationToken cancellationToken)
    {
        if (currentUserService.UserId is null)
        {
            throw new UnauthorizedAppException("Authenticated user is required.");
        }

        return await dbContext.DeliveryUsers.SingleOrDefaultAsync(x => x.UserId == currentUserService.UserId.Value, cancellationToken)
            ?? throw new NotFoundException("Delivery profile not found.");
    }

    private async Task<OrderDto> MapOrderAsync(Order order, CancellationToken cancellationToken)
    {
        DeliveryUser? deliveryAssignee = null;

        if (order.DeliveryUserId.HasValue)
        {
            deliveryAssignee = await dbContext.DeliveryUsers.AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == order.DeliveryUserId.Value, cancellationToken);
        }

        return order.ToDto(deliveryAssignee);
    }

    private async Task<IReadOnlyCollection<OrderDto>> MapOrdersAsync(IReadOnlyCollection<Order> orders, CancellationToken cancellationToken)
    {
        var deliveryUserIds = orders
            .Where(order => order.DeliveryUserId.HasValue)
            .Select(order => order.DeliveryUserId!.Value)
            .Distinct()
            .ToArray();

        var deliveryUsers = deliveryUserIds.Length == 0
            ? []
            : await dbContext.DeliveryUsers.AsNoTracking()
                .Where(x => deliveryUserIds.Contains(x.Id))
                .ToListAsync(cancellationToken);

        var deliveryUsersById = deliveryUsers.ToDictionary(x => x.Id);

        return orders
            .Select(order => order.ToDto(
                order.DeliveryUserId.HasValue && deliveryUsersById.TryGetValue(order.DeliveryUserId.Value, out var deliveryUser)
                    ? deliveryUser
                    : null))
            .ToArray();
    }

    private void EnsureStoreScopedRole()
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.DeliveryUser or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Authenticated role is required.");
        }
    }

    private void EnsureOrderAccess(Order order)
    {
        if (currentUserService.Role == UserRole.SuperAdmin)
        {
            return;
        }

        if (currentUserService.Role == UserRole.StoreAdmin && currentUserService.StoreId == order.StoreId)
        {
            return;
        }

        if (currentUserService.Role == UserRole.DeliveryUser)
        {
            return;
        }

        throw new ForbiddenException("You do not have access to this order.");
    }

    private void EnsureOrderMutationAccess(Order order)
    {
        if (currentUserService.Role == UserRole.SuperAdmin)
        {
            return;
        }

        if (currentUserService.Role == UserRole.StoreAdmin && currentUserService.StoreId == order.StoreId)
        {
            return;
        }

        if (currentUserService.Role == UserRole.DeliveryUser)
        {
            return;
        }

        throw new ForbiddenException("You do not have permission to modify this order.");
    }
}
