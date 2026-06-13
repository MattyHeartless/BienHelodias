import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { getApiErrorMessage } from '../core/api-error.util';
import { ApiResponse } from '../core/models';
import { NotificationUiService } from '../core/notification-ui.service';
import { environment } from '../../environments/environment';

type PushAvailability = 'supported' | 'unsupported';

export interface PushRegistrationState {
  availability: PushAvailability;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isRegistering: boolean;
  backendSynchronized: boolean;
  message: string | null;
}

interface RegisterPushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}

interface PushSubscriptionDiagnosticDto {
  isActive: boolean;
  endpoint: string;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationUiService);
  private initialized = false;

  readonly state = signal<PushRegistrationState>({
    availability: 'unsupported',
    permission: 'unsupported',
    isSubscribed: false,
    isRegistering: false,
    backendSynchronized: false,
    message: null
  });

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    if (this.swPush.isEnabled) {
      this.swPush.notificationClicks.subscribe(({ notification }) => {
        const orderId = this.getOrderId(notification.data);
        void this.router.navigate(['/panel'], {
          queryParams: orderId ? { orderId } : undefined
        });
      });
    }

    void this.refreshState();
  }

  async refreshState(): Promise<void> {
    if (!this.isSupported()) {
      this.state.set({
        availability: 'unsupported',
        permission: 'unsupported',
        isSubscribed: false,
        isRegistering: false,
        backendSynchronized: false,
        message: 'Los avisos solo jalan cuando abres la app instalada, con service worker activo.'
      });
      return;
    }

    const subscription = await firstValueFrom(this.swPush.subscription);
    this.state.set({
      availability: 'supported',
      permission: Notification.permission,
      isSubscribed: Boolean(subscription),
      isRegistering: false,
      backendSynchronized: subscription ? await this.checkBackendRegistration(subscription.endpoint) : false,
      message: this.getStateMessage(Notification.permission, Boolean(subscription))
    });
  }

  async subscribeCourierToPushNotifications(): Promise<void> {
    if (!this.isSupported()) {
      await this.refreshState();
      return;
    }

    if (!environment.push.vapidPublicKey.trim()) {
      this.state.update((current) => ({
        ...current,
        availability: 'supported',
        permission: Notification.permission,
        message: 'Falta configurar la VAPID public key antes de activar avisos en este dispositivo.'
      }));
      this.notifications.warning({
        summary: 'Falta configurar la VAPID key'
      });
      return;
    }

    this.state.update((current) => ({
      ...current,
      availability: 'supported',
      permission: Notification.permission,
      isRegistering: true,
      message: 'Aguanta, estamos pidiendo permiso y dejando este dispositivo listo...'
    }));

    try {
      const currentSubscription = await firstValueFrom(this.swPush.subscription);
      const subscription =
        currentSubscription ??
        (await this.swPush.requestSubscription({
          serverPublicKey: environment.push.vapidPublicKey
        }));

      const backendSynchronized = await this.registerSubscription(subscription);

      this.state.set({
        availability: 'supported',
        permission: Notification.permission,
        isSubscribed: true,
        isRegistering: false,
        backendSynchronized,
        message: backendSynchronized
          ? 'Listo, este dispositivo ya quedó pendiente de nuevos pedidos.'
          : 'El navegador ya quedó listo, pero todavía falta amarrar este dispositivo.'
      });
      this.notifications.success({
        summary: backendSynchronized ? 'Avisos activados' : 'Avisos activados con detalle pendiente'
      });
    } catch (error) {
      const detail = getApiErrorMessage(error, 'Se nos calentaron los avisos... intenta otra vez.');
      this.state.set({
        availability: 'supported',
        permission: Notification.permission,
        isSubscribed: false,
        isRegistering: false,
        backendSynchronized: false,
        message: detail
      });
      this.notifications.error({
        summary: detail
      });
    }
  }

  async unsubscribeCurrentDevice(): Promise<void> {
    if (!this.isSupported()) {
      await this.refreshState();
      return;
    }

    this.state.update((current) => ({
      ...current,
      isRegistering: true,
      message: 'Quitando los avisos de este dispositivo...'
    }));

    const subscription = await firstValueFrom(this.swPush.subscription);
    if (!subscription) {
      await this.refreshState();
      return;
    }

    try {
      await subscription.unsubscribe();
      await this.deleteCurrentSubscription(subscription.endpoint);
      this.state.set({
        availability: 'supported',
        permission: Notification.permission,
        isSubscribed: false,
        isRegistering: false,
        backendSynchronized: false,
        message: 'Listo, este dispositivo ya no recibirá avisos.'
      });
      this.notifications.info({
        summary: 'Avisos desactivados'
      });
    } catch (error) {
      const detail = getApiErrorMessage(error, 'No se pudieron apagar los avisos de este dispositivo.');
      this.state.set({
        availability: 'supported',
        permission: Notification.permission,
        isSubscribed: true,
        isRegistering: false,
        backendSynchronized: false,
        message: detail
      });
      this.notifications.error({
        summary: detail
      });
    }
  }

  private async registerSubscription(subscription: PushSubscription): Promise<boolean> {
    if (!environment.push.registrationEnabled) {
      return false;
    }

    const body = this.mapSubscription(subscription);

    try {
      await firstValueFrom(
        this.http.post<ApiResponse<{ success: boolean }>>(`${environment.apiBaseUrl}/push-subscriptions`, body)
      );
      return true;
    } catch {
      return false;
    }
  }

  private async deleteCurrentSubscription(endpoint: string): Promise<void> {
    if (!environment.push.registrationEnabled) {
      return;
    }

    await firstValueFrom(
      this.http.delete<ApiResponse<{ success: boolean }>>(`${environment.apiBaseUrl}/push-subscriptions/current`, {
        body: { endpoint }
      })
    );
  }

  private async checkBackendRegistration(endpoint: string): Promise<boolean> {
    if (!environment.push.registrationEnabled) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PushSubscriptionDiagnosticDto>>(`${environment.apiBaseUrl}/push-subscriptions/me`, {
          params: { endpoint }
        })
      );
      return response.data.isActive && response.data.endpoint === endpoint;
    } catch {
      return false;
    }
  }

  private mapSubscription(subscription: PushSubscription): RegisterPushSubscriptionRequest {
    const json = subscription.toJSON();
    const keys = json.keys ?? {};

    return {
      endpoint: subscription.endpoint,
      p256dh: keys['p256dh'] ?? '',
      auth: keys['auth'] ?? '',
      userAgent: navigator.userAgent
    };
  }

  private getOrderId(data: unknown): string | null {
    if (!data || typeof data !== 'object' || !('orderId' in data)) {
      return null;
    }

    const { orderId } = data as { orderId?: string | number | null };
    return orderId == null ? null : String(orderId);
  }

  private getStateMessage(permission: NotificationPermission, isSubscribed: boolean): string {
    if (permission === 'denied') {
      return 'El navegador bloqueó los avisos. Vas a tener que prenderlos manualmente en la configuración del sitio.';
    }

    if (isSubscribed) {
      return 'Este dispositivo ya está listo para recibir avisos.';
    }

    return 'Activa los avisos para enterarte cuando caigan nuevos pedidos.';
  }

  private isSupported(): boolean {
    return typeof window !== 'undefined' && typeof Notification !== 'undefined' && this.swPush.isEnabled;
  }
}
