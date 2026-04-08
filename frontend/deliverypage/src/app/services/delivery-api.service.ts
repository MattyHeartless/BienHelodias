import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  DeliveryAvailability,
  DeliveryUserDto,
  OrderDto,
  OrderStatus,
  PagedResult
} from '../core/models';

@Injectable({ providedIn: 'root' })
export class DeliveryApiService {
  private readonly http = inject(HttpClient);
  private readonly deliveryUrl = 'http://localhost:5078/api/delivery';
  private readonly ordersUrl = 'http://localhost:5078/api/orders';

  getAvailableOrders(): Observable<ApiResponse<PagedResult<OrderDto>>> {
    return this.http.get<ApiResponse<PagedResult<OrderDto>>>(`${this.deliveryUrl}/orders/available`, {
      params: { page: 1, pageSize: 20 }
    });
  }

  getMyOrders(): Observable<ApiResponse<PagedResult<OrderDto>>> {
    return this.http.get<ApiResponse<PagedResult<OrderDto>>>(`${this.deliveryUrl}/orders/mine`, {
      params: { page: 1, pageSize: 20 }
    });
  }

  updateAvailability(availability: DeliveryAvailability): Observable<ApiResponse<DeliveryUserDto>> {
    return this.http.patch<ApiResponse<DeliveryUserDto>>(`${this.deliveryUrl}/availability`, { availability });
  }

  takeOrder(orderId: string): Observable<ApiResponse<OrderDto>> {
    return this.http.post<ApiResponse<OrderDto>>(`${this.ordersUrl}/${orderId}/take`, {});
  }

  releaseOrder(orderId: string): Observable<ApiResponse<OrderDto>> {
    return this.http.post<ApiResponse<OrderDto>>(`${this.ordersUrl}/${orderId}/release`, {});
  }

  markDelivered(orderId: string): Observable<ApiResponse<OrderDto>> {
    return this.http.patch<ApiResponse<OrderDto>>(`${this.ordersUrl}/${orderId}/status`, {
      status: OrderStatus.Delivered
    });
  }
}
