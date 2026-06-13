import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppRole, AuthTokenDto } from './models';
import { AuthApiService } from '../services/auth-api.service';

@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  private readonly authApi = inject(AuthApiService);
  private readonly sessionValue = signal<AuthTokenDto | null>(null);
  private restoreInFlight: Promise<boolean> | null = null;

  readonly role = computed<AppRole | null>(() => {
    switch (this.sessionValue()?.role) {
      case AppRole.StoreAdmin:
        return AppRole.StoreAdmin;
      case AppRole.SuperAdmin:
        return AppRole.SuperAdmin;
      default:
        return null;
    }
  });

  readonly email = computed(() => this.sessionValue()?.email ?? null);
  readonly storeId = computed(() => this.sessionValue()?.storeId ?? null);
  readonly isAuthenticated = computed(() => Boolean(this.sessionValue()));

  setSession(payload: AuthTokenDto): void {
    this.sessionValue.set(payload);
  }

  clear(): void {
    this.sessionValue.set(null);
  }

  async ensureSession(): Promise<boolean> {
    if (this.sessionValue()) {
      return true;
    }

    if (this.restoreInFlight) {
      return this.restoreInFlight;
    }

    this.restoreInFlight = this.restoreSession();
    const restored = await this.restoreInFlight;
    this.restoreInFlight = null;
    return restored;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.authApi.logout());
    } finally {
      this.clear();
    }
  }

  private async restoreSession(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.authApi.refresh());
      this.setSession(response.data);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }
}
