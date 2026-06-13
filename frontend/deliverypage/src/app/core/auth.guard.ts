import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DeliverySessionService } from './delivery-session.service';
import { AppRole } from './models';

export const authGuard: CanActivateFn = () => {
  const session = inject(DeliverySessionService);
  const router = inject(Router);

  return session
    .ensureSession()
    .then((isAuthenticated) =>
      isAuthenticated && session.role() ===  AppRole.DeliveryUser ? true : router.createUrlTree(['/login'])
    );
};
