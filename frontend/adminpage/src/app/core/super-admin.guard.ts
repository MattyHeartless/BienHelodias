import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionService } from './admin-session.service';
import { AppRole } from './models';

export const superAdminGuard: CanActivateFn = () => {
  const session = inject(AdminSessionService);
  const router = inject(Router);

  return session
    .ensureSession()
    .then((isAuthenticated) =>
      !isAuthenticated
        ? router.createUrlTree(['/login'])
        : session.role() === AppRole.SuperAdmin
          ? true
          : router.createUrlTree(['/dashboard/overview'])
    );
};
