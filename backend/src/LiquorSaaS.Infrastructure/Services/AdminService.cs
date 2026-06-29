using LiquorSaaS.Application.Admin;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Application.Delivery;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Mapping;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class AdminService(
    LiquorSaaSDbContext dbContext,
    ITenantProvider tenantProvider,
    ICurrentUserService currentUserService) : IAdminService
{
    private const int DefaultDashboardRangeDays = 30;
    private const int MaxDashboardRangeDays = 365;
    private const int LowStockThreshold = 5;
    private const int StockAlertsLimit = 8;
    private const int TopSellingProductsLimit = 5;
    private const int TopStoresLimit = 6;
    private const int RecentOrdersLimit = 5;
    private const int RecentStoresLimit = 5;
    private const int StoreHealthLimit = 6;

    public async Task<DashboardDto> GetDashboardAsync(CancellationToken cancellationToken)
    {
        var storeId = GetDashboardStoreId();
        var orders = dbContext.Orders.AsNoTracking().Where(x => x.StoreId == storeId);
        var products = dbContext.Products.AsNoTracking().Where(x => x.StoreId == storeId);

        return new DashboardDto(
            await products.CountAsync(cancellationToken),
            await products.CountAsync(x => x.IsActive, cancellationToken),
            await orders.CountAsync(cancellationToken),
            await orders.CountAsync(x => x.Status == OrderStatus.Pending, cancellationToken),
            await orders.CountAsync(x => x.Status == OrderStatus.Ready, cancellationToken),
            await orders.CountAsync(x => x.Status == OrderStatus.OnTheWay, cancellationToken),
            await orders.Where(x => x.Status != OrderStatus.Cancelled).Select(x => (decimal?)x.Total).SumAsync(cancellationToken) ?? 0m);
    }

    public async Task<DashboardOverviewDto> GetDashboardOverviewAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken)
    {
        var storeId = GetDashboardStoreId();
        var period = ResolveDashboardPeriod(from, to);

        var products = dbContext.Products.AsNoTracking().Where(x => x.StoreId == storeId);
        var activeProducts = products.Where(x => x.IsActive);
        var ordersInPeriod = dbContext.Orders
            .AsNoTracking()
            .Where(x => x.StoreId == storeId && x.CreatedAtUtc >= period.From && x.CreatedAtUtc < period.ToExclusive);
        var revenueOrders = ordersInPeriod.Where(x => x.Status != OrderStatus.Cancelled);

        var productStats = await products
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalProducts = group.Count(),
                ActiveProducts = group.Count(x => x.IsActive),
                InactiveProducts = group.Count(x => !x.IsActive),
                LowStockProducts = group.Count(x => x.IsActive && x.Stock > 0 && x.Stock <= LowStockThreshold),
                OutOfStockProducts = group.Count(x => x.IsActive && x.Stock == 0),
                HealthyProducts = group.Count(x => x.IsActive && x.Stock > LowStockThreshold),
                InventoryValue = group.Sum(x => (decimal?)(x.Price * x.Stock)) ?? 0m
            })
            .SingleOrDefaultAsync(cancellationToken);

        var orderStatusRows = await ordersInPeriod
            .GroupBy(x => x.Status)
            .Select(group => new
            {
                Status = group.Key,
                Count = group.Count(),
                Revenue = group.Sum(x => x.Status == OrderStatus.Cancelled ? 0m : x.Total)
            })
            .ToListAsync(cancellationToken);

        var totalOrders = orderStatusRows.Sum(x => x.Count);
        var revenue = orderStatusRows.Sum(x => x.Revenue);
        var revenueOrderCount = orderStatusRows
            .Where(x => x.Status != OrderStatus.Cancelled)
            .Sum(x => x.Count);
        int GetStatusCount(OrderStatus status) => orderStatusRows.SingleOrDefault(x => x.Status == status)?.Count ?? 0;

        var revenueRows = await revenueOrders
            .GroupBy(x => x.CreatedAtUtc.Date)
            .Select(group => new
            {
                Date = group.Key,
                Orders = group.Count(),
                Revenue = group.Sum(x => x.Total)
            })
            .ToListAsync(cancellationToken);

        var revenueByDate = revenueRows.ToDictionary(x => x.Date.Date);
        var revenueByDay = Enumerable
            .Range(0, (period.To.Date - period.From.Date).Days + 1)
            .Select(offset =>
            {
                var date = period.From.Date.AddDays(offset);
                var row = revenueByDate.GetValueOrDefault(date);
                var dayRevenue = row?.Revenue ?? 0m;
                var dayOrders = row?.Orders ?? 0;

                return new RevenuePointDto(
                    date,
                    dayOrders,
                    dayRevenue,
                    dayOrders == 0 ? 0m : Math.Round(dayRevenue / dayOrders, 2));
            })
            .ToList();

        var ordersByStatus = Enum.GetValues<OrderStatus>()
            .Select(status =>
            {
                var row = orderStatusRows.SingleOrDefault(x => x.Status == status);
                var count = row?.Count ?? 0;

                return new OrderStatusMetricDto(
                    status,
                    GetOrderStatusLabel(status),
                    count,
                    totalOrders == 0 ? 0m : Math.Round(count * 100m / totalOrders, 1),
                    row?.Revenue ?? 0m);
            })
            .ToList();

        var stockByCategoryRows = await products
            .GroupBy(x => x.Category)
            .Select(group => new
            {
                Category = group.Key,
                Products = group.Count(),
                Units = group.Sum(x => x.Stock),
                InventoryValue = group.Sum(x => (decimal?)(x.Price * x.Stock)) ?? 0m,
                LowStockProducts = group.Count(x => x.IsActive && x.Stock > 0 && x.Stock <= LowStockThreshold)
            })
            .OrderByDescending(x => x.InventoryValue)
            .ThenBy(x => x.Category)
            .Take(8)
            .ToListAsync(cancellationToken);

        var stockByCategory = stockByCategoryRows
            .Select(x => new CategoryStockDto(
                x.Category,
                x.Products,
                x.Units,
                x.InventoryValue,
                x.LowStockProducts))
            .ToList();

        var stockAlerts = await activeProducts
            .Where(x => x.Stock <= LowStockThreshold)
            .OrderBy(x => x.Stock)
            .ThenBy(x => x.Name)
            .Take(StockAlertsLimit)
            .Select(x => new StockAlertProductDto(
                x.Id,
                x.Name,
                x.Category,
                x.Stock,
                x.Price,
                x.ImageUrl,
                x.Stock == 0 ? "out" : "low"))
            .ToListAsync(cancellationToken);

        var recentOrders = await ordersInPeriod
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(RecentOrdersLimit)
            .Select(x => new RecentOrderDto(
                x.Id,
                x.CustomerName,
                x.Status,
                x.Total,
                x.Items.Sum(item => item.Quantity),
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        var topSellingRows = await (
                from order in revenueOrders
                join item in dbContext.OrderItems.AsNoTracking() on order.Id equals item.OrderId
                group item by new { item.ProductId, item.ProductNameSnapshot } into groupItems
                orderby groupItems.Sum(x => x.Subtotal) descending, groupItems.Sum(x => x.Quantity) descending
                select new
                {
                    groupItems.Key.ProductId,
                    Name = groupItems.Key.ProductNameSnapshot,
                    UnitsSold = groupItems.Sum(x => x.Quantity),
                    Revenue = groupItems.Sum(x => x.Subtotal)
                })
            .Take(TopSellingProductsLimit)
            .ToListAsync(cancellationToken);

        var topSellingProductIds = topSellingRows.Select(x => x.ProductId).ToList();
        var topSellingProductDetails = await products
            .Where(x => topSellingProductIds.Contains(x.Id))
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Category,
                x.ImageUrl
            })
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var topSellingProducts = topSellingRows
            .Select(x =>
            {
                topSellingProductDetails.TryGetValue(x.ProductId, out var product);

                return new TopSellingProductDto(
                    x.ProductId,
                    product?.Name ?? x.Name,
                    product?.Category ?? "Sin categoria",
                    x.UnitsSold,
                    x.Revenue,
                    product?.ImageUrl);
            })
            .ToList();

        var kpis = new DashboardKpisDto(
            totalOrders,
            revenue,
            revenueOrderCount == 0 ? 0m : Math.Round(revenue / revenueOrderCount, 2),
            GetStatusCount(OrderStatus.Pending),
            GetStatusCount(OrderStatus.Ready),
            GetStatusCount(OrderStatus.OnTheWay),
            GetStatusCount(OrderStatus.Delivered),
            GetStatusCount(OrderStatus.Cancelled),
            productStats?.TotalProducts ?? 0,
            productStats?.ActiveProducts ?? 0,
            productStats?.LowStockProducts ?? 0,
            productStats?.OutOfStockProducts ?? 0,
            productStats?.InventoryValue ?? 0m);

        var inventoryHealth = new InventoryHealthDto(
            productStats?.ActiveProducts ?? 0,
            productStats?.InactiveProducts ?? 0,
            productStats?.LowStockProducts ?? 0,
            productStats?.OutOfStockProducts ?? 0,
            productStats?.HealthyProducts ?? 0,
            LowStockThreshold);

        return new DashboardOverviewDto(
            new DashboardPeriodDto(period.From, period.To),
            kpis,
            revenueByDay,
            ordersByStatus,
            inventoryHealth,
            stockByCategory,
            topSellingProducts,
            stockAlerts,
            recentOrders);
    }

    public async Task<SuperAdminDashboardOverviewDto> GetSuperAdminDashboardOverviewAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken)
    {
        EnsureSuperAdmin();

        var period = ResolveDashboardPeriod(from, to);
        var stores = dbContext.Stores.AsNoTracking();
        var products = dbContext.Products.AsNoTracking();
        var ordersInPeriod = dbContext.Orders
            .AsNoTracking()
            .Where(x => x.CreatedAtUtc >= period.From && x.CreatedAtUtc < period.ToExclusive);
        var revenueOrders = ordersInPeriod.Where(x => x.Status != OrderStatus.Cancelled);

        var storeStats = await stores
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalStores = group.Count(),
                ActiveStores = group.Count(x => x.IsActive),
                InactiveStores = group.Count(x => !x.IsActive),
                TrialStores = group.Count(x => x.SubscriptionStatus == SubscriptionStatus.Trial),
                ActiveSubscriptions = group.Count(x => x.SubscriptionStatus == SubscriptionStatus.Active),
                SuspendedStores = group.Count(x => x.SubscriptionStatus == SubscriptionStatus.Suspended),
                CancelledStores = group.Count(x => x.SubscriptionStatus == SubscriptionStatus.Cancelled)
            })
            .SingleOrDefaultAsync(cancellationToken);

        var productStats = await products
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalProducts = group.Count(),
                ActiveProducts = group.Count(x => x.IsActive),
                LowStockProducts = group.Count(x => x.IsActive && x.Stock > 0 && x.Stock <= LowStockThreshold),
                OutOfStockProducts = group.Count(x => x.IsActive && x.Stock == 0),
                InventoryValue = group.Sum(x => (decimal?)(x.Price * x.Stock)) ?? 0m
            })
            .SingleOrDefaultAsync(cancellationToken);

        var orderStatusRows = await ordersInPeriod
            .GroupBy(x => x.Status)
            .Select(group => new
            {
                Status = group.Key,
                Count = group.Count(),
                Revenue = group.Sum(x => x.Status == OrderStatus.Cancelled ? 0m : x.Total)
            })
            .ToListAsync(cancellationToken);

        var totalOrders = orderStatusRows.Sum(x => x.Count);
        var revenue = orderStatusRows.Sum(x => x.Revenue);
        var revenueOrderCount = orderStatusRows
            .Where(x => x.Status != OrderStatus.Cancelled)
            .Sum(x => x.Count);
        var storesWithOrders = await ordersInPeriod
            .Select(x => x.StoreId)
            .Distinct()
            .CountAsync(cancellationToken);

        var revenueRows = await revenueOrders
            .GroupBy(x => x.CreatedAtUtc.Date)
            .Select(group => new
            {
                Date = group.Key,
                Orders = group.Count(),
                Revenue = group.Sum(x => x.Total)
            })
            .ToListAsync(cancellationToken);

        var revenueByDate = revenueRows.ToDictionary(x => x.Date.Date);
        var revenueByDay = Enumerable
            .Range(0, (period.To.Date - period.From.Date).Days + 1)
            .Select(offset =>
            {
                var date = period.From.Date.AddDays(offset);
                var row = revenueByDate.GetValueOrDefault(date);
                var dayRevenue = row?.Revenue ?? 0m;
                var dayOrders = row?.Orders ?? 0;

                return new RevenuePointDto(
                    date,
                    dayOrders,
                    dayRevenue,
                    dayOrders == 0 ? 0m : Math.Round(dayRevenue / dayOrders, 2));
            })
            .ToList();

        var ordersByStatus = Enum.GetValues<OrderStatus>()
            .Select(status =>
            {
                var row = orderStatusRows.SingleOrDefault(x => x.Status == status);
                var count = row?.Count ?? 0;

                return new OrderStatusMetricDto(
                    status,
                    GetOrderStatusLabel(status),
                    count,
                    totalOrders == 0 ? 0m : Math.Round(count * 100m / totalOrders, 1),
                    row?.Revenue ?? 0m);
            })
            .ToList();

        var subscriptionRows = await stores
            .GroupBy(x => x.SubscriptionStatus)
            .Select(group => new
            {
                Status = group.Key,
                Count = group.Count()
            })
            .ToListAsync(cancellationToken);

        var totalStores = storeStats?.TotalStores ?? 0;
        var storesBySubscription = Enum.GetValues<SubscriptionStatus>()
            .Select(status =>
            {
                var count = subscriptionRows.SingleOrDefault(x => x.Status == status)?.Count ?? 0;

                return new SubscriptionStatusMetricDto(
                    status,
                    GetSubscriptionStatusLabel(status),
                    count,
                    totalStores == 0 ? 0m : Math.Round(count * 100m / totalStores, 1));
            })
            .ToList();

        var topStoresByRevenueRows = await revenueOrders
            .GroupBy(x => x.StoreId)
            .Select(group => new
            {
                StoreId = group.Key,
                Orders = group.Count(),
                Revenue = group.Sum(x => x.Total)
            })
            .OrderByDescending(x => x.Revenue)
            .ThenByDescending(x => x.Orders)
            .Take(TopStoresLimit)
            .ToListAsync(cancellationToken);

        var topStoresByOrdersRows = await ordersInPeriod
            .GroupBy(x => x.StoreId)
            .Select(group => new
            {
                StoreId = group.Key,
                Orders = group.Count(),
                Revenue = group.Sum(x => x.Status == OrderStatus.Cancelled ? 0m : x.Total)
            })
            .OrderByDescending(x => x.Orders)
            .ThenByDescending(x => x.Revenue)
            .Take(TopStoresLimit)
            .ToListAsync(cancellationToken);

        var topStoreIds = topStoresByRevenueRows
            .Select(x => x.StoreId)
            .Concat(topStoresByOrdersRows.Select(x => x.StoreId))
            .Distinct()
            .ToList();
        var topStoreLookup = await stores
            .Where(x => topStoreIds.Contains(x.Id))
            .Select(x => new { x.Id, x.Name, x.Slug })
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        TopStoreMetricDto ToTopStoreMetric(Guid storeId, int orders, decimal storeRevenue)
        {
            topStoreLookup.TryGetValue(storeId, out var store);

            return new TopStoreMetricDto(
                storeId,
                store?.Name ?? "Tienda eliminada",
                store?.Slug ?? "sin-slug",
                orders,
                storeRevenue,
                orders == 0 ? 0m : Math.Round(storeRevenue / orders, 2));
        }

        var topStoresByRevenue = topStoresByRevenueRows
            .Select(row => ToTopStoreMetric(row.StoreId, row.Orders, row.Revenue))
            .ToList();
        var topStoresByOrders = topStoresByOrdersRows
            .Select(row => ToTopStoreMetric(row.StoreId, row.Orders, row.Revenue))
            .ToList();

        var productHealthRows = await products
            .Where(x => x.IsActive && x.Stock <= LowStockThreshold)
            .GroupBy(x => x.StoreId)
            .Select(group => new
            {
                StoreId = group.Key,
                LowStockProducts = group.Count(x => x.Stock > 0),
                OutOfStockProducts = group.Count(x => x.Stock == 0)
            })
            .ToListAsync(cancellationToken);

        var orderHealthRows = await ordersInPeriod
            .Where(x => x.Status == OrderStatus.Pending || x.Status == OrderStatus.OnTheWay)
            .GroupBy(x => x.StoreId)
            .Select(group => new
            {
                StoreId = group.Key,
                PendingOrders = group.Count(x => x.Status == OrderStatus.Pending),
                OnTheWayOrders = group.Count(x => x.Status == OrderStatus.OnTheWay),
                LastOrderAtUtc = (DateTime?)group.Max(x => x.CreatedAtUtc)
            })
            .ToListAsync(cancellationToken);

        var operationalStoreIds = productHealthRows
            .Select(x => x.StoreId)
            .Concat(orderHealthRows.Select(x => x.StoreId))
            .Distinct()
            .ToList();
        var operationalStoreLookup = await stores
            .Where(x => operationalStoreIds.Contains(x.Id))
            .Select(x => new { x.Id, x.Name, x.Slug, x.IsActive, x.SubscriptionStatus })
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        var productHealthLookup = productHealthRows.ToDictionary(x => x.StoreId);
        var orderHealthLookup = orderHealthRows.ToDictionary(x => x.StoreId);

        var storeOperationalHealth = operationalStoreIds
            .Select(storeId =>
            {
                operationalStoreLookup.TryGetValue(storeId, out var store);
                productHealthLookup.TryGetValue(storeId, out var productHealth);
                orderHealthLookup.TryGetValue(storeId, out var orderHealth);

                return new StoreOperationalHealthDto(
                    storeId,
                    store?.Name ?? "Tienda eliminada",
                    store?.Slug ?? "sin-slug",
                    store?.IsActive ?? false,
                    store?.SubscriptionStatus ?? SubscriptionStatus.Cancelled,
                    productHealth?.LowStockProducts ?? 0,
                    productHealth?.OutOfStockProducts ?? 0,
                    orderHealth?.PendingOrders ?? 0,
                    orderHealth?.OnTheWayOrders ?? 0,
                    orderHealth?.LastOrderAtUtc);
            })
            .OrderByDescending(x => x.OutOfStockProducts)
            .ThenByDescending(x => x.LowStockProducts)
            .ThenByDescending(x => x.PendingOrders + x.OnTheWayOrders)
            .ThenByDescending(x => x.LastOrderAtUtc)
            .Take(StoreHealthLimit)
            .ToList();

        var recentStores = await stores
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(RecentStoresLimit)
            .Select(x => new RecentStoreDto(
                x.Id,
                x.Name,
                x.Slug,
                x.IsActive,
                x.SubscriptionStatus,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        var recentOrderRows = await ordersInPeriod
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(RecentOrdersLimit)
            .Select(x => new
            {
                x.Id,
                x.StoreId,
                x.CustomerName,
                x.Status,
                x.Total,
                ItemCount = x.Items.Sum(item => item.Quantity),
                x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);
        var recentOrderStoreIds = recentOrderRows.Select(x => x.StoreId).Distinct().ToList();
        var recentOrderStoreLookup = await stores
            .Where(x => recentOrderStoreIds.Contains(x.Id))
            .Select(x => new { x.Id, x.Name })
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        var recentOrders = recentOrderRows
            .Select(x =>
            {
                recentOrderStoreLookup.TryGetValue(x.StoreId, out var store);

                return new SuperAdminRecentOrderDto(
                    x.Id,
                    x.StoreId,
                    store?.Name ?? "Tienda eliminada",
                    x.CustomerName,
                    x.Status,
                    x.Total,
                    x.ItemCount,
                    x.CreatedAtUtc);
            })
            .ToList();

        var kpis = new SuperAdminDashboardKpisDto(
            storeStats?.TotalStores ?? 0,
            storeStats?.ActiveStores ?? 0,
            storeStats?.InactiveStores ?? 0,
            storeStats?.TrialStores ?? 0,
            storeStats?.ActiveSubscriptions ?? 0,
            storeStats?.SuspendedStores ?? 0,
            storeStats?.CancelledStores ?? 0,
            storesWithOrders,
            totalOrders,
            revenue,
            revenueOrderCount == 0 ? 0m : Math.Round(revenue / revenueOrderCount, 2),
            productStats?.TotalProducts ?? 0,
            productStats?.ActiveProducts ?? 0,
            productStats?.LowStockProducts ?? 0,
            productStats?.OutOfStockProducts ?? 0,
            productStats?.InventoryValue ?? 0m);

        return new SuperAdminDashboardOverviewDto(
            new DashboardPeriodDto(period.From, period.To),
            kpis,
            revenueByDay,
            ordersByStatus,
            storesBySubscription,
            topStoresByRevenue,
            topStoresByOrders,
            storeOperationalHealth,
            recentStores,
            recentOrders);
    }

    public async Task<IReadOnlyList<StoreAdminDto>> GetStoreAdminsAsync(Guid storeId, CancellationToken cancellationToken)
    {
        if (currentUserService.Role != UserRole.SuperAdmin)
        {
            throw new ForbiddenException("Super admin role is required.");
        }

        var storeExists = await dbContext.Stores
            .AsNoTracking()
            .AnyAsync(x => x.Id == storeId, cancellationToken);

        if (!storeExists)
        {
            throw new NotFoundException("Store not found.");
        }

        return await dbContext.Users
            .AsNoTracking()
            .Where(x => x.StoreId == storeId && x.Role == UserRole.StoreAdmin)
            .OrderBy(x => x.Name)
            .Select(x => new StoreAdminDto(
                x.Id,
                x.StoreId!.Value,
                x.Name,
                x.Email,
                x.IsActive,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DeliveryUserDto>> GetDeliveryUsersAsync(CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();

        var storeId = tenantProvider.GetRequiredStoreId();
        return await dbContext.DeliveryUsers
            .AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderBy(x => x.FullName)
            .Select(x => x.ToDto())
            .ToListAsync(cancellationToken);
    }

    public async Task<DeliveryUserDto> UpdateDeliveryUserStatusAsync(Guid deliveryUserId, UpdateDeliveryUserStatusRequest request, CancellationToken cancellationToken)
    {
        EnsureStoreAdminOrSuperAdmin();

        var storeId = tenantProvider.GetRequiredStoreId();
        var deliveryUser = await dbContext.DeliveryUsers
            .SingleOrDefaultAsync(x => x.Id == deliveryUserId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("Delivery user not found.");

        var appUser = await dbContext.Users
            .SingleOrDefaultAsync(x => x.Id == deliveryUser.UserId && x.StoreId == storeId, cancellationToken)
            ?? throw new NotFoundException("App user for delivery profile was not found.");

        deliveryUser.SetActive(request.IsActive);
        appUser.Update(appUser.Name, request.IsActive);

        if (!request.IsActive)
        {
            deliveryUser.UpdateAvailability(DeliveryAvailability.Unavailable);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return deliveryUser.ToDto();
    }

    private void EnsureStoreAdminOrSuperAdmin()
    {
        if (currentUserService.Role is not (UserRole.StoreAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenException("Store admin or super admin role is required.");
        }
    }

    private void EnsureSuperAdmin()
    {
        if (currentUserService.Role != UserRole.SuperAdmin)
        {
            throw new ForbiddenException("Super admin role is required.");
        }
    }

    private Guid GetDashboardStoreId()
    {
        EnsureStoreAdminOrSuperAdmin();

        if (currentUserService.Role == UserRole.StoreAdmin)
        {
            return currentUserService.StoreId
                ?? throw new ForbiddenException("Store admin has no store assigned.");
        }

        return tenantProvider.GetRequiredStoreId();
    }

    private static (DateTime From, DateTime To, DateTime ToExclusive) ResolveDashboardPeriod(DateTime? from, DateTime? to)
    {
        var today = DateTime.UtcNow.Date;
        var fromDate = (from ?? today.AddDays(-(DefaultDashboardRangeDays - 1))).Date;
        var toDate = (to ?? today).Date;

        if (fromDate > toDate)
        {
            throw new AppValidationException("Dashboard start date cannot be after end date.");
        }

        if ((toDate - fromDate).TotalDays + 1 > MaxDashboardRangeDays)
        {
            throw new AppValidationException($"Dashboard date range cannot exceed {MaxDashboardRangeDays} days.");
        }

        return (fromDate, toDate, toDate.AddDays(1));
    }

    private static string GetOrderStatusLabel(OrderStatus status) =>
        status switch
        {
            OrderStatus.Pending => "Pendiente",
            OrderStatus.Accepted => "Aceptado",
            OrderStatus.Preparing => "Preparando",
            OrderStatus.Ready => "Listo",
            OrderStatus.OnTheWay => "En camino",
            OrderStatus.Delivered => "Entregado",
            OrderStatus.Cancelled => "Cancelado",
            _ => "Sin estado"
        };

    private static string GetSubscriptionStatusLabel(SubscriptionStatus status) =>
        status switch
        {
            SubscriptionStatus.Trial => "Trial",
            SubscriptionStatus.Active => "Activa",
            SubscriptionStatus.Suspended => "Suspendida",
            SubscriptionStatus.Cancelled => "Cancelada",
            _ => "Sin estado"
        };
}
