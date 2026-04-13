import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionService } from './admin-session.service';
import { AppRole } from './models';

export const storeAdminGuard: CanActivateFn = () => {
  const session = inject(AdminSessionService);
  const router = inject(Router);

  if (!session.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return session.role() === AppRole.StoreAdmin ? true : router.createUrlTree(['/dashboard/overview']);
};
