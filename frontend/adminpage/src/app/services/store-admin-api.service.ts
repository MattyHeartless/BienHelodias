import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, AuthTokenDto, BannerDto, DashboardDto, DeliveryUserDto, OrderDto, PagedResult, ProductDto, StoreDto } from '../core/models';
import { AdminSessionService } from '../core/admin-session.service';

@Injectable({ providedIn: 'root' })
export class StoreAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AdminSessionService);
  private readonly adminUrl = 'http://localhost:5078/api/admin/dashboard';
  private readonly adminBaseUrl = 'http://localhost:5078/api/admin';
  private readonly authUrl = 'http://localhost:5078/api/auth';
  private readonly productsUrl = 'http://localhost:5078/api/products';
  private readonly ordersUrl = 'http://localhost:5078/api/orders';
  private readonly storesUrl = 'http://localhost:5078/api/stores';
  private readonly bannersUrl = 'http://localhost:5078/api/banners';

  getDashboard(): Observable<ApiResponse<DashboardDto>> {
    return this.http.get<ApiResponse<DashboardDto>>(this.adminUrl);
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

  getProducts(): Observable<ApiResponse<PagedResult<ProductDto>>> {
    return this.http.get<ApiResponse<PagedResult<ProductDto>>>(this.productsUrl, {
      params: { page: 1, pageSize: 24 }
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

  getOrders(): Observable<ApiResponse<PagedResult<OrderDto>>> {
    return this.http.get<ApiResponse<PagedResult<OrderDto>>>(this.ordersUrl, {
      params: { page: 1, pageSize: 10 }
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
