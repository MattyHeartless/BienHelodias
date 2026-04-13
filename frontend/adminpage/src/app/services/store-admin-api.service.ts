import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, DashboardDto, PagedResult, ProductDto, OrderDto } from '../core/models';

@Injectable({ providedIn: 'root' })
export class StoreAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = 'http://localhost:5078/api/admin/dashboard';
  private readonly productsUrl = 'http://localhost:5078/api/products';
  private readonly ordersUrl = 'http://localhost:5078/api/orders';

  getDashboard(): Observable<ApiResponse<DashboardDto>> {
    return this.http.get<ApiResponse<DashboardDto>>(this.adminUrl);
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
}
