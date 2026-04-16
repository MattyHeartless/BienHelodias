import { computed, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';
import { getApiErrorMessage } from '../core/api-error.util';
import { StorefrontStoreDto } from '../core/models';
import { StorefrontContentApiService } from './storefront-content-api.service';

@Injectable({ providedIn: 'root' })
export class StorefrontTenantService {
  private static readonly DEFAULT_TITLE = 'Bien Helodias | Landing';
  private readonly storefrontContentApi = inject(StorefrontContentApiService);
  private readonly title = inject(Title);

  readonly store = signal<StorefrontStoreDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly slug = computed(() => this.store()?.slug ?? null);
  readonly storeId = computed(() => this.store()?.id ?? null);

  loadStore(slug: string): Observable<StorefrontStoreDto> {
    const normalizedSlug = slug.trim().toLowerCase();
    const currentStore = this.store();

    if (currentStore?.slug === normalizedSlug) {
      this.error.set(null);
      return of(currentStore);
    }

    this.loading.set(true);
    this.error.set(null);

    return this.storefrontContentApi.getStoreBySlug(normalizedSlug).pipe(
      map((response) => response.data),
      tap((store) => {
        this.store.set(store);
        this.error.set(null);
        this.title.setTitle(`${store.name} | Landing`);
      }),
      catchError((error) => {
        this.store.set(null);
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar la tienda solicitada.'));
        this.title.setTitle(StorefrontTenantService.DEFAULT_TITLE);
        return throwError(() => error);
      }),
      finalize(() => {
        this.loading.set(false);
      })
    );
  }

  clear(): void {
    this.store.set(null);
    this.error.set(null);
    this.loading.set(false);
    this.title.setTitle(StorefrontTenantService.DEFAULT_TITLE);
  }
}
