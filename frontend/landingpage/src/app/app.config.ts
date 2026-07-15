import { ApplicationConfig } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { tenantInterceptor } from './core/tenant.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const direction = getStoreViewDirection(from, to);
          if (!direction) {
            transition.skipTransition();
            return;
          }

          document.documentElement.dataset['routeTransition'] = direction;
          void transition.finished.finally(() => {
            delete document.documentElement.dataset['routeTransition'];
          });
        }
      })
    ),
    provideHttpClient(withInterceptors([tenantInterceptor]))
  ]
};

function getStoreViewDirection(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): 'forward' | 'back' | null {
  const fromIndex = getStoreViewIndex(getRoutePath(from));
  const toIndex = getStoreViewIndex(getRoutePath(to));

  if (fromIndex === null || toIndex === null || fromIndex === toIndex) {
    return null;
  }

  return toIndex > fromIndex ? 'forward' : 'back';
}

function getRoutePath(route: ActivatedRouteSnapshot): string | undefined {
  let currentRoute = route;
  while (currentRoute.firstChild) {
    currentRoute = currentRoute.firstChild;
  }

  return currentRoute.routeConfig?.path;
}

function getStoreViewIndex(routePath: string | undefined): number | null {
  switch (routePath) {
    case ':slug':
      return 0;
    case ':slug/order/:id':
      return 1;
    case ':slug/cart':
      return 2;
    default:
      return null;
  }
}
