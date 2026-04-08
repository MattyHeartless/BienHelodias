import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/catalog-page.component').then((m) => m.CatalogPageComponent)
  },
  {
    path: 'order/:id',
    loadComponent: () => import('./pages/order-tracking-page.component').then((m) => m.OrderTrackingPageComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
