import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DeliverySessionService } from './delivery-session.service';

export const authGuard: CanActivateFn = () => {
  const session = inject(DeliverySessionService);
  const router = inject(Router);

  return session.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
