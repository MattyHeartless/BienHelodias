import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  AuthTokenDto,
  BannerDto,
  DashboardDto,
  DashboardOverviewDto,
  DeliveryUserDto,
  InventoryAiAnalysisDto,
  InventoryAiCommitRequest,
  InventoryAiCommitResultDto,
  OrderDto,
  PagedResult,
  ProductDto,
  StoreDto
} from '../core/models';
import { AdminSessionService } from '../core/admin-session.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StoreAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AdminSessionService);
    private readonly apiUrl = environment.apiUrl;
  private readonly adminUrl = `${this.apiUrl}/admin/dashboard`;
  private readonly adminBaseUrl = `${this.apiUrl}/admin`;
  private readonly authUrl = `${this.apiUrl}/auth`;
  private readonly productsUrl = `${this.apiUrl}/products`;
  private readonly ordersUrl = `${this.apiUrl}/orders`;
  private readonly storesUrl = `${this.apiUrl}/stores`;
  private readonly bannersUrl = `${this.apiUrl}/banners`;
  private readonly inventoryAiUrl = `${this.adminBaseUrl}/inventory-ai`;

  getDashboard(): Observable<ApiResponse<DashboardDto>> {
    return this.http.get<ApiResponse<DashboardDto>>(this.adminUrl);
  }

  getDashboardOverview(from?: string, to?: string): Observable<ApiResponse<DashboardOverviewDto>> {
    const params: Record<string, string> = {};

    if (from) {
      params['from'] = from;
    }

    if (to) {
      params['to'] = to;
    }

    return this.http.get<ApiResponse<DashboardOverviewDto>>(`${this.adminUrl}/overview`, { params });
  }

  getDeliveryUsers(): Observable<ApiResponse<DeliveryUserDto[]>> {
    return this.http.get<ApiResponse<DeliveryUserDto[]>>(`${this.adminBaseUrl}/delivery-users`);
  }

  createDeliveryUser(request: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }): Observable<ApiResponse<AuthTokenDto>> {
    return this.http.post<ApiResponse<AuthTokenDto>>(`${this.authUrl}/register-delivery`, {
      ...request,
      storeId: null
    });
  }

  updateDeliveryUserStatus(deliveryUserId: string, isActive: boolean): Observable<ApiResponse<DeliveryUserDto>> {
    return this.http.patch<ApiResponse<DeliveryUserDto>>(`${this.adminBaseUrl}/delivery-users/${deliveryUserId}/status`, { isActive });
  }

  getProducts(pageSize = 24): Observable<ApiResponse<PagedResult<ProductDto>>> {
    return this.http.get<ApiResponse<PagedResult<ProductDto>>>(this.productsUrl, {
      params: { page: 1, pageSize }
    });
  }

  getProduct(productId: string): Observable<ApiResponse<ProductDto>> {
    return this.http.get<ApiResponse<ProductDto>>(`${this.productsUrl}/${productId}`);
  }

  createProduct(request: {
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    imageUrl: string | null;
  }): Observable<ApiResponse<ProductDto>> {
    return this.http.post<ApiResponse<ProductDto>>(this.productsUrl, request);
  }

  updateProduct(
    productId: string,
    request: {
      name: string;
      description: string;
      price: number;
      stock: number;
      category: string;
      imageUrl: string | null;
      isActive: boolean;
    }
  ): Observable<ApiResponse<ProductDto>> {
    return this.http.put<ApiResponse<ProductDto>>(`${this.productsUrl}/${productId}`, request);
  }

  deleteProduct(productId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.productsUrl}/${productId}`);
  }

  updateProductStatus(productId: string, isActive: boolean): Observable<ApiResponse<ProductDto>> {
    return this.http.patch<ApiResponse<ProductDto>>(`${this.productsUrl}/${productId}/status`, { isActive });
  }

  analyzeInventoryImage(image: File): Observable<ApiResponse<InventoryAiAnalysisDto>> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post<ApiResponse<InventoryAiAnalysisDto>>(`${this.inventoryAiUrl}/analyze`, formData);
  }

  commitInventoryAi(request: InventoryAiCommitRequest): Observable<ApiResponse<InventoryAiCommitResultDto>> {
    return this.http.post<ApiResponse<InventoryAiCommitResultDto>>(`${this.inventoryAiUrl}/commit`, request);
  }

  getOrders(search = ''): Observable<ApiResponse<PagedResult<OrderDto>>> {
    const params: Record<string, string | number> = { page: 1, pageSize: 10 };
    const query = search.trim();

    if (query) {
      params['q'] = query;
    }

    return this.http.get<ApiResponse<PagedResult<OrderDto>>>(this.ordersUrl, {
      params
    });
  }

  getOrder(orderId: string): Observable<ApiResponse<OrderDto>> {
    return this.http.get<ApiResponse<OrderDto>>(`${this.ordersUrl}/${orderId}`);
  }

  getMyStore(): Observable<ApiResponse<StoreDto>> {
    return this.http.get<ApiResponse<StoreDto>>(`${this.storesUrl}/${this.requireStoreId()}`);
  }

  updateMyStore(request: {
    name: string;
    slug: string;
    isActive: boolean;
    welcomePhrase: string | null;
  }): Observable<ApiResponse<StoreDto>> {
    return this.http.put<ApiResponse<StoreDto>>(`${this.storesUrl}/${this.requireStoreId()}`, request);
  }

  getBanners(): Observable<ApiResponse<PagedResult<BannerDto>>> {
    return this.http.get<ApiResponse<PagedResult<BannerDto>>>(this.bannersUrl, {
      params: { page: 1, pageSize: 24 }
    });
  }

  createBanner(request: {
    header: string;
    title: string;
    description: string;
    wildcard: string | null;
    expirationDate: string | null;
    status: boolean;
    promotion: {
      name: string | null;
      code: string | null;
      type: number;
      percentageValue: number | null;
      buyQuantity: number | null;
      freeQuantity: number | null;
      targetProductId: string | null;
    } | null;
  }): Observable<ApiResponse<BannerDto>> {
    return this.http.post<ApiResponse<BannerDto>>(this.bannersUrl, request);
  }

  updateBanner(
    bannerId: string,
    request: {
      header: string;
      title: string;
      description: string;
      wildcard: string | null;
      expirationDate: string | null;
      status: boolean;
      promotion: {
        name: string | null;
        code: string | null;
        type: number;
        percentageValue: number | null;
        buyQuantity: number | null;
        freeQuantity: number | null;
        targetProductId: string | null;
      } | null;
    }
  ): Observable<ApiResponse<BannerDto>> {
    return this.http.put<ApiResponse<BannerDto>>(`${this.bannersUrl}/${bannerId}`, request);
  }

  deleteBanner(bannerId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.bannersUrl}/${bannerId}`);
  }

  updateBannerStatus(bannerId: string, status: boolean): Observable<ApiResponse<BannerDto>> {
    return this.http.patch<ApiResponse<BannerDto>>(`${this.bannersUrl}/${bannerId}/status`, { status });
  }

  private requireStoreId(): string {
    const storeId = this.session.storeId();

    if (!storeId) {
      throw new Error('No se encontro el storeId en la sesion actual.');
    }

    return storeId;
  }
}
