import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { storeAdminGuard } from './core/store-admin.guard';
import { superAdminGuard } from './core/super-admin.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview'
      },
      {
        path: 'overview',
        loadComponent: () => import('./pages/dashboard-overview-page.component').then((m) => m.DashboardOverviewPageComponent)
      },
      {
        path: 'stores',
        canActivate: [superAdminGuard],
        loadComponent: () => import('./pages/superadmin-stores-page.component').then((m) => m.SuperadminStoresPageComponent)
      },
      {
        path: 'orders',
        canActivate: [storeAdminGuard],
        loadComponent: () => import('./pages/orders-page.component').then((m) => m.OrdersPageComponent)
      },
      {
        path: 'orders/:orderId',
        canActivate: [storeAdminGuard],
        loadComponent: () => import('./pages/orders-page.component').then((m) => m.OrdersPageComponent)
      },
      {
        path: 'catalog',
        canActivate: [storeAdminGuard],
        loadComponent: () => import('./pages/catalog-page.component').then((m) => m.CatalogPageComponent)
      },
      {
        path: 'store',
        canActivate: [storeAdminGuard],
        loadComponent: () => import('./pages/store-settings-page.component').then((m) => m.StoreSettingsPageComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
