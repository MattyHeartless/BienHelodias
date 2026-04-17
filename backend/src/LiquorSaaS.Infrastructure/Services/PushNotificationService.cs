using System.Net;
using System.Text.Json;
using LiquorSaaS.Application.Push;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebPush;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class PushNotificationService(
    LiquorSaaSDbContext dbContext,
    IOptions<PushNotificationOptions> options,
    ILogger<PushNotificationService> logger) : IPushNotificationService
{
    private readonly PushNotificationOptions _options = options.Value;

    public async Task NotifyNewOrderAsync(Guid orderId, CancellationToken cancellationToken)
    {
        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.PublicKey) || string.IsNullOrWhiteSpace(_options.PrivateKey))
        {
            logger.LogDebug("Push notifications are disabled or incomplete in configuration. Skipping order {OrderId}", orderId);
            return;
        }

        var order = await dbContext.Orders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == orderId, cancellationToken);

        if (order is null)
        {
            logger.LogWarning("Order {OrderId} was not found while dispatching push notifications.", orderId);
            return;
        }

        var subscriptions = await (
            from subscription in dbContext.CourierPushSubscriptions
            join deliveryUser in dbContext.DeliveryUsers on subscription.DeliveryUserId equals deliveryUser.Id
            where subscription.StoreId == order.StoreId
                  && subscription.IsActive
                  && deliveryUser.IsActive
                  && deliveryUser.CurrentAvailability == Domain.Enums.DeliveryAvailability.Available
            select subscription)
            .ToListAsync(cancellationToken);

        if (subscriptions.Count == 0)
        {
            logger.LogInformation("No active push subscriptions found for store {StoreId} when order {OrderId} was created.", order.StoreId, order.Id);
            return;
        }

        var payload = JsonSerializer.Serialize(new
        {
            notification = new
            {
                title = "Nuevo pedido",
                body = "Hay un pedido nuevo disponible para tomar.",
                icon = "/icons/app-icon.svg",
                badge = "/icons/app-icon.svg",
                data = new
                {
                    orderId = order.Id,
                    url = $"/panel?orderId={order.Id}",
                    onActionClick = new
                    {
                        @default = new
                        {
                            operation = "navigateLastFocusedOrOpen",
                            url = $"/panel?orderId={order.Id}"
                        }
                    }
                }
            }
        });

        var client = new WebPushClient();
        var vapidDetails = new VapidDetails(_options.Subject, _options.PublicKey, _options.PrivateKey);

        foreach (var subscription in subscriptions)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                await client.SendNotificationAsync(
                    new PushSubscription(subscription.Endpoint, subscription.P256DH, subscription.Auth),
                    payload,
                    vapidDetails,
                    cancellationToken: cancellationToken);

                subscription.MarkNotificationSent();
            }
            catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            {
                subscription.Deactivate();
                logger.LogInformation("Push subscription {SubscriptionId} was deactivated after provider response {StatusCode}.", subscription.Id, ex.StatusCode);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send push notification for order {OrderId} to subscription {SubscriptionId}", order.Id, subscription.Id);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
