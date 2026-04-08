import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PagedResult, StoreDto, SubscriptionStatus, AuthTokenDto } from '../core/models';

@Injectable({ providedIn: 'root' })
export class SuperadminApiService {
  private readonly http = inject(HttpClient);
  private readonly storesUrl = 'http://localhost:5078/api/stores';
  private readonly superadminUrl = 'http://localhost:5078/api/superadmin/stores';
  private readonly authUrl = 'http://localhost:5078/api/auth';

  getStores(): Observable<ApiResponse<PagedResult<StoreDto>>> {
    return this.http.get<ApiResponse<PagedResult<StoreDto>>>(this.superadminUrl, {
      params: { page: 1, pageSize: 50 }
    });
  }

  createStore(request: { name: string; slug: string; subscriptionStatus: SubscriptionStatus }): Observable<ApiResponse<StoreDto>> {
    return this.http.post<ApiResponse<StoreDto>>(this.storesUrl, request);
  }

  updateSubscription(storeId: string, subscriptionStatus: SubscriptionStatus): Observable<ApiResponse<StoreDto>> {
    return this.http.patch<ApiResponse<StoreDto>>(`${this.superadminUrl}/${storeId}/subscription`, {
      subscriptionStatus
    });
  }

  registerAdmin(request: { name: string; email: string; password: string; storeId: string }): Observable<ApiResponse<AuthTokenDto>> {
    return this.http.post<ApiResponse<AuthTokenDto>>(`${this.authUrl}/register-admin`, request);
  }
}
