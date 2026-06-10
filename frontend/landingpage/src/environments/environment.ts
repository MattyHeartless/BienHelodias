const resolveApiBaseUrl = (): string => {
  const hostname = globalThis.location?.hostname ?? 'localhost';
  const isLoopbackHost = hostname === 'localhost' || hostname === '127.0.0.1';

  return isLoopbackHost
    ? 'https://localhost:7296/api'
    : `http://${hostname}:5078/api`;
};

export const environment = {
  production: true,
  apiBaseUrl: resolveApiBaseUrl()
};
