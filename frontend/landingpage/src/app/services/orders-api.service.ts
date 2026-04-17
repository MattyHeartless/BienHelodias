import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, CreateOrderRequest, OrderDto } from '../core/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/orders`;

  createOrder(request: CreateOrderRequest): Observable<ApiResponse<OrderDto>> {
    return this.http.post<ApiResponse<OrderDto>>(this.baseUrl, request);
  }
}
