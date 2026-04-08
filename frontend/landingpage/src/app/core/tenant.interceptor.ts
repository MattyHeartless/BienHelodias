import { HttpInterceptorFn } from '@angular/common/http';

export const tenantInterceptor: HttpInterceptorFn = (request, next) => {
  const apiRequest = request.clone({
    setHeaders: {
      'X-Store-Id': '6f514f4d-a00c-4580-88f4-a3c85c7f24db'
    }
  });

  return next(apiRequest);
};
