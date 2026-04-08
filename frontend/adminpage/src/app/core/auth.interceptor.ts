import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminSessionService } from './admin-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AdminSessionService);
  const token = session.token();

  if (!token || !request.url.startsWith('http://localhost:5078/api')) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
