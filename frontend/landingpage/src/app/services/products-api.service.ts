import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PagedResult, ProductDto } from '../core/models';

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5078/api/products';

  getCatalog(): Observable<ApiResponse<PagedResult<ProductDto>>> {
    return this.http.get<ApiResponse<PagedResult<ProductDto>>>(`${this.baseUrl}/catalog`, {
      params: { page: 1, pageSize: 24 }
    });
  }
}
