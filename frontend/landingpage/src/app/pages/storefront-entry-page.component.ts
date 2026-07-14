import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StorefrontStoreListItemDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { StorefrontContentApiService } from '../services/storefront-content-api.service';

type LocationState = 'requesting' | 'granted' | 'denied' | 'unsupported';

@Component({
  selector: 'app-storefront-entry-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './storefront-entry-page.component.html',
  styleUrl: './storefront-entry-page.component.css'
})
export class StorefrontEntryPageComponent implements OnInit {
  private readonly storefrontApi = inject(StorefrontContentApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stores = signal<StorefrontStoreListItemDto[]>([]);
  readonly locationState = signal<LocationState>('requesting');
  readonly userLatitude = signal<number | null>(null);
  readonly userLongitude = signal<number | null>(null);

  readonly hasStores = computed(() => this.stores().length > 0);
  readonly isUsingLocation = computed(() => this.locationState() === 'granted');
  readonly heroTitle = computed(() => this.isUsingLocation() ? 'Pide cerca, pide rápido' : 'Encuentra tu tienda');
  readonly heroLead = computed(() =>
    this.isUsingLocation()
      ? 'Abrimos con las mas cercanas.'
      : 'Explora tiendas activas y entra directo.'
  );
  readonly locationBadge = computed(() => {
    switch (this.locationState()) {
      case 'granted':
        return 'Cercanía activa';
      case 'denied':
        return 'Modo directorio';
      case 'unsupported':
        return 'Sin geolocalizacion';
      default:
        return 'Buscando ubicacion';
    }
  });
  readonly highlightedStore = computed(() => this.stores()[0] ?? null);
  readonly storeCountLabel = computed(() => `${this.stores().length} tiendas`);
  readonly resultsTitle = computed(() => this.isUsingLocation() ? 'Más cerca de ti' : 'Tiendas disponibles');
  readonly resultsLead = computed(() =>
    this.isUsingLocation()
      ? 'Ordenadas por cercanía para entrar rápido.'
      : 'Directorio activo para elegir tu punto de compra.'
  );
  readonly statusMessage = computed(() => {
    switch (this.locationState()) {
      case 'granted':
        return 'Ubicacion activa y orden por cercania.';
      case 'denied':
        return 'Sin permiso de ubicacion. Mostrando todas.';
      case 'unsupported':
        return 'Este navegador no comparte ubicacion.';
      default:
        return 'Solicitando acceso a tu ubicacion.';
    }
  });

  ngOnInit(): void {
    this.loadStoresFromCurrentLocation();
  }

  retryWithLocation(): void {
    this.loadStoresFromCurrentLocation();
  }

  openStore(store: StorefrontStoreListItemDto): void {
    void this.router.navigate(['/', store.slug]);
  }

  trackStore(index: number, store: StorefrontStoreListItemDto): string {
    return store.id ?? `${store.slug}-${index}`;
  }

  formatDistance(distanceKm: number | null): string | null {
    if (distanceKm === null) {
      return null;
    }

    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }

    return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
  }

  storeIndexLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  private loadStoresFromCurrentLocation(): void {
    this.loading.set(true);
    this.error.set(null);

    if (!('geolocation' in navigator)) {
      this.locationState.set('unsupported');
      this.userLatitude.set(null);
      this.userLongitude.set(null);
      this.fetchStores();
      return;
    }

    this.locationState.set('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        this.userLatitude.set(latitude);
        this.userLongitude.set(longitude);
        this.locationState.set('granted');
        this.fetchStores(latitude, longitude);
      },
      () => {
        this.userLatitude.set(null);
        this.userLongitude.set(null);
        this.locationState.set('denied');
        this.fetchStores();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  private fetchStores(latitude?: number, longitude?: number): void {
    this.storefrontApi.getStores(latitude, longitude).subscribe({
      next: (response) => {
        this.stores.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar las tiendas disponibles.'));
        this.stores.set([]);
        this.loading.set(false);
      }
    });
  }
}
