import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/storefront-entry-page.component').then((m) => m.StorefrontEntryPageComponent)
  },
  {
    path: ':slug/order/:id',
    loadComponent: () => import('./pages/order-tracking-page.component').then((m) => m.OrderTrackingPageComponent)
  },
  {
    path: ':slug',
    loadComponent: () => import('./pages/catalog-page.component').then((m) => m.CatalogPageComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
