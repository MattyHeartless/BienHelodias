import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PagedResult, ProductDto } from '../core/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/products`;

  getCatalog(): Observable<ApiResponse<PagedResult<ProductDto>>> {
    return this.http.get<ApiResponse<PagedResult<ProductDto>>>(`${this.baseUrl}/catalog`, {
      params: { page: 1, pageSize: 24 }
    });
  }
}
