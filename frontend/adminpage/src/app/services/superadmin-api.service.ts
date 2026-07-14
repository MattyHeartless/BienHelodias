import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PagedResult, StoreDto, StoreAdminDto, SubscriptionStatus, AuthTokenDto, SuperAdminDashboardOverviewDto } from '../core/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SuperadminApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly storesUrl = `${this.apiUrl}/stores`;
  private readonly superadminUrl = `${this.apiUrl}/superadmin/stores`;
  private readonly dashboardUrl = `${this.apiUrl}/superadmin/dashboard`;
  private readonly authUrl = `${this.apiUrl}/auth`;

  getStores(): Observable<ApiResponse<PagedResult<StoreDto>>> {
    return this.http.get<ApiResponse<PagedResult<StoreDto>>>(this.superadminUrl, {
      params: { page: 1, pageSize: 50 }
    });
  }

  getStoreAdmins(storeId: string): Observable<ApiResponse<StoreAdminDto[]>> {
    return this.http.get<ApiResponse<StoreAdminDto[]>>(`${this.superadminUrl}/${storeId}/admins`);
  }

  getDashboardOverview(from?: string, to?: string): Observable<ApiResponse<SuperAdminDashboardOverviewDto>> {
    const params: Record<string, string> = {};

    if (from) {
      params['from'] = from;
    }

    if (to) {
      params['to'] = to;
    }

    return this.http.get<ApiResponse<SuperAdminDashboardOverviewDto>>(`${this.dashboardUrl}/overview`, { params });
  }

  createStore(request: { name: string; slug: string; subscriptionStatus: SubscriptionStatus }): Observable<ApiResponse<StoreDto>> {
    return this.http.post<ApiResponse<StoreDto>>(this.storesUrl, request);
  }

  updateStore(storeId: string, request: {
    name: string;
    slug: string;
    isActive: boolean;
    welcomePhrase?: string | null;
    openingTime?: string | null;
    closingTime?: string | null;
    cartonPrice?: number | null;
    bucketPrice?: number | null;
    minimumPurchase?: number | null;
  }): Observable<ApiResponse<StoreDto>> {
    return this.http.put<ApiResponse<StoreDto>>(`${this.storesUrl}/${storeId}`, request);
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
