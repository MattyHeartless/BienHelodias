import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, CreateOrderRequest, OrderDto, PromotionValidationDto, ValidatePromotionRequest } from '../core/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/orders`;
  private readonly promotionsUrl = `${environment.apiBaseUrl}/promotions`;

  createOrder(request: CreateOrderRequest): Observable<ApiResponse<OrderDto>> {
    return this.http.post<ApiResponse<OrderDto>>(this.baseUrl, request);
  }

  validatePromotion(request: ValidatePromotionRequest): Observable<ApiResponse<PromotionValidationDto>> {
    return this.http.post<ApiResponse<PromotionValidationDto>>(`${this.promotionsUrl}/validate`, request);
  }
}
