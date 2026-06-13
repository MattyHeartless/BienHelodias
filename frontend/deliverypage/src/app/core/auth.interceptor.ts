import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DeliverySessionService } from './delivery-session.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  inject(DeliverySessionService);

  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }

  return next(
    request.clone({
      withCredentials: true
    })
  );
};
