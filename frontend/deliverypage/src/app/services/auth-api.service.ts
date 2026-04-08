import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, AuthTokenDto } from '../core/models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5078/api/auth';

  login(email: string, password: string): Observable<ApiResponse<AuthTokenDto>> {
    return this.http.post<ApiResponse<AuthTokenDto>>(`${this.baseUrl}/login`, { email, password });
  }
}
