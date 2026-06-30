import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminSessionService } from '../core/admin-session.service';
import { AppRole, StoreDto } from '../core/models';
import { StoreAdminApiService } from '../services/store-admin-api.service';
import { MobileDrawerMenuComponent } from './mobile-drawer-menu.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MobileDrawerMenuComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css'
})
export class AdminShellComponent {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  private readonly storeAdminApi = inject(StoreAdminApiService);

  readonly role = this.session.role;
  readonly email = this.session.email;
  readonly menuOpen = signal(false);
  readonly currentStore = signal<StoreDto | null>(null);
  readonly isSuperAdmin = computed(() => this.role() === AppRole.SuperAdmin);
  readonly workspaceTitle = computed(() => {
    if (this.isSuperAdmin()) {
      return 'Panel maestro de licorerias';
    }

    return this.currentStore()?.name ?? 'Administracion de tienda';
  });
  readonly workspaceSubtitle = computed(() => {
    if (this.isSuperAdmin()) {
      return `${this.email()}. Gestiona licorerias, suscripciones y administradores.`;
    }

    return 'Gestiona pedidos, inventario y configuracion de la tienda.';
  });
  readonly workspaceBadge = computed(() => {
    if (this.isSuperAdmin()) {
      return 'Vista global';
    }

    const store = this.currentStore();

    if (!store) {
      return 'Tienda';
    }

    return store.isActive ? 'Tienda activa' : 'Tienda inactiva';
  });
  readonly navigation = computed(() => {
    const items = [
      { label: 'Dashboard', route: '/dashboard/overview', icon: 'dashboard' }
    ];

    if (this.role() === AppRole.SuperAdmin) {
      items.push({ label: 'Licorerías', route: '/dashboard/stores', icon: 'storefront' });
    }

    if (this.role() === AppRole.StoreAdmin) {
      items.push(
        { label: 'Mi tienda', route: '/dashboard/store', icon: 'storefront' },
        { label: 'Pedidos', route: '/dashboard/orders', icon: 'receipt_long' },
        { label: 'Catálogo', route: '/dashboard/catalog', icon: 'inventory_2' }
      );
    }

    return items;
  });

  constructor() {
    this.loadCurrentStore();
  }

  openMenu(): void {
    this.menuOpen.set(true);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    void this.session.logout().then(() => this.router.navigate(['/login']));
  }

  private loadCurrentStore(): void {
    if (this.role() !== AppRole.StoreAdmin) {
      return;
    }

    this.storeAdminApi.getMyStore().subscribe({
      next: (response) => this.currentStore.set(response.data),
      error: () => this.currentStore.set(null)
    });
  }
}
