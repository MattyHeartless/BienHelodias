import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminSessionService } from './admin-session.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  inject(AdminSessionService);

  if (!request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }

  return next(
    request.clone({
      withCredentials: true
    })
  );
};
