import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DeliverySessionService } from './delivery-session.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(DeliverySessionService);
  const token = session.token();

  if (!token || !request.url.startsWith(environment.apiBaseUrl)) {
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
