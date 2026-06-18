import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/showcase-page.component').then((m) => m.ShowcasePageComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
