import { computed, Injectable, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { AppRole, AuthTokenDto, DecodedToken } from './models';

const STORAGE_KEY = 'bien-helodias-delivery-session';

@Injectable({ providedIn: 'root' })
export class DeliverySessionService {
  private readonly tokenValue = signal<string | null>(localStorage.getItem(STORAGE_KEY));

  readonly token = computed(() => this.tokenValue());
  readonly decoded = computed<DecodedToken | null>(() => {
    const token = this.tokenValue();
    if (!token) {
      return null;
    }

    try {
      return jwtDecode<DecodedToken>(token);
    } catch {
      return null;
    }
  });

  readonly role = computed<AppRole | null>(() => {
    const role = this.decoded()?.role;
    switch (role) {
      case '2':
      case 'DeliveryUser':
        return AppRole.DeliveryUser;
      default:
        return null;
    }
  });

  readonly email = computed(() => this.decoded()?.email ?? null);
  readonly storeId = computed(() => this.decoded()?.storeId ?? null);
  readonly isAuthenticated = computed(() => Boolean(this.tokenValue()));

  setSession(payload: AuthTokenDto): void {
    localStorage.setItem(STORAGE_KEY, payload.accessToken);
    this.tokenValue.set(payload.accessToken);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.tokenValue.set(null);
  }
}
