import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

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
    loadComponent: () => import('./pages/dashboard-page.component').then((m) => m.DashboardPageComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
