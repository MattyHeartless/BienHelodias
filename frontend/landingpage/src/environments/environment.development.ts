const resolveApiBaseUrl = (): string => {
  const hostname = globalThis.location?.hostname ?? 'localhost';
  const isLoopbackHost = hostname === 'localhost' || hostname === '127.0.0.1';

  return isLoopbackHost
    ? 'http://localhost:5078/api'
    : `http://${hostname}:5078/api`;
};

export const environment = {
  production: false,
  apiBaseUrl: resolveApiBaseUrl()
};
