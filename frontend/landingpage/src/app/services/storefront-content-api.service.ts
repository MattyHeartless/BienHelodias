import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, StorefrontContentDto, StorefrontStoreDto } from '../core/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StorefrontContentApiService {
  private readonly http = inject(HttpClient);
  private readonly storefrontUrl = `${environment.apiBaseUrl}/storefront`;

  getStoreBySlug(slug: string): Observable<ApiResponse<StorefrontStoreDto>> {
    return this.http.get<ApiResponse<StorefrontStoreDto>>(`${this.storefrontUrl}/stores/${encodeURIComponent(slug)}`);
  }

  getContent(): Observable<ApiResponse<StorefrontContentDto>> {
    return this.http.get<ApiResponse<StorefrontContentDto>>(`${this.storefrontUrl}/content`);
  }
}
