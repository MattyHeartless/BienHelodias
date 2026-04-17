import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, AuthTokenDto } from '../core/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  login(email: string, password: string): Observable<ApiResponse<AuthTokenDto>> {
    return this.http.post<ApiResponse<AuthTokenDto>>(`${this.baseUrl}/login`, { email, password });
  }
}
