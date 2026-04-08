import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DeliveryAvailability, DeliveryUserDto, OrderDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { DeliverySessionService } from '../core/delivery-session.service';
import { DeliveryApiService } from '../services/delivery-api.service';

@Component({
  selector: 'app-panel-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './panel-page.component.html',
  styleUrl: './panel-page.component.css'
})
export class PanelPageComponent {
  private readonly deliveryApi = inject(DeliveryApiService);
  private readonly session = inject(DeliverySessionService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly profile = signal<DeliveryUserDto | null>(null);
  readonly availableOrders = signal<OrderDto[]>([]);
  readonly myOrders = signal<OrderDto[]>([]);
  readonly availability = signal(DeliveryAvailability.Available);
  readonly availabilityOptions = [
    { label: 'Unavailable', value: DeliveryAvailability.Unavailable },
    { label: 'Available', value: DeliveryAvailability.Available },
    { label: 'Busy', value: DeliveryAvailability.Busy }
  ];

  readonly email = this.session.email;
  readonly availabilityLabel = computed(
    () => this.availabilityOptions.find((option) => option.value === this.availability())?.label ?? 'Available'
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.feedback.set(null);

    forkJoin({
      available: this.deliveryApi.getAvailableOrders(),
      mine: this.deliveryApi.getMyOrders()
    }).subscribe({
      next: (response) => {
        this.availableOrders.set(response.available.data.items);
        this.myOrders.set(response.mine.data.items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar el panel de reparto.'));
        this.loading.set(false);
      }
    });
  }

  updateAvailability(value: DeliveryAvailability): void {
    this.deliveryApi.updateAvailability(value).subscribe({
      next: (response) => {
        this.profile.set(response.data);
        this.availability.set(response.data.currentAvailability);
        this.feedback.set(`Disponibilidad actual: ${this.availabilityLabel()}`);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar la disponibilidad.'));
      }
    });
  }

  takeOrder(orderId: string): void {
    this.deliveryApi.takeOrder(orderId).subscribe({
      next: () => {
        this.feedback.set('Pedido tomado correctamente.');
        this.availability.set(DeliveryAvailability.Busy);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible tomar el pedido.'));
      }
    });
  }

  releaseOrder(orderId: string): void {
    this.deliveryApi.releaseOrder(orderId).subscribe({
      next: () => {
        this.feedback.set('Pedido liberado correctamente.');
        this.availability.set(DeliveryAvailability.Available);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible liberar el pedido.'));
      }
    });
  }

  markDelivered(orderId: string): void {
    this.deliveryApi.markDelivered(orderId).subscribe({
      next: () => {
        this.feedback.set('Pedido marcado como entregado.');
        this.availability.set(DeliveryAvailability.Available);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible marcar el pedido como entregado.'));
      }
    });
  }

  logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }
}
