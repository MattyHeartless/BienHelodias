import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorefrontTenantService } from '../services/storefront-tenant.service';
import { environment } from '../../environments/environment';

export const tenantInterceptor: HttpInterceptorFn = (request, next) => {
  const storefrontTenant = inject(StorefrontTenantService);
  const storeId = storefrontTenant.storeId();

  if (!storeId || !request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }

  const apiRequest = request.clone({
    setHeaders: {
      'X-Store-Id': storeId
    }
  });

  return next(apiRequest);
};
