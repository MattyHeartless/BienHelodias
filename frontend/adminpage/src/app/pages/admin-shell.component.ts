import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminSessionService } from '../core/admin-session.service';
import { AppRole } from '../core/models';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css'
})
export class AdminShellComponent {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);

  readonly role = this.session.role;
  readonly email = this.session.email;
  readonly menuOpen = signal(false);
  readonly isSuperAdmin = computed(() => this.role() === AppRole.SuperAdmin);
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
        { label: 'Catalogo', route: '/dashboard/catalog', icon: 'inventory_2' }
      );
    }

    return items;
  });

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.session.clear();
    void this.router.navigate(['/login']);
  }
}
