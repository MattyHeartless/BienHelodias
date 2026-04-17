# HTTPS local para pruebas en celular

## IP LAN actual

- Laptop en Wi-Fi: `192.168.1.39`

Si tu IP cambia, vuelve a generar el certificado y actualiza `frontend/deliverypage/src/environments/environment.lan.ts`.

## 1. Generar certificado local

Desde la raíz del repo:

```powershell
.\scripts\generate-local-https-cert.ps1 -IpAddresses 192.168.1.39
```

Archivos generados:

- `.local-dev-certs/lan-root-ca.cer`
- `.local-dev-certs/lan-dev-cert.pfx`
- `.local-dev-certs/lan-dev-cert.pem`
- `.local-dev-certs/lan-dev-key.pem`
- `.local-dev-certs/lan-dev-cert.cer`

## 2. Levantar backend por HTTPS accesible en red

```powershell
.\scripts\start-backend-lan.ps1
```

Queda expuesto en:

- `https://192.168.1.39:7296`
- `http://192.168.1.39:5078`

## 3. Levantar frontend delivery como PWA por HTTPS

```powershell
.\scripts\start-delivery-frontend-lan.ps1
```

Queda expuesto en:

- `https://192.168.1.39:4200`

Este flujo sirve archivos estáticos del `dist` y sí incluye `service worker`, así que es el modo correcto para probar PWA/push.
También hace fallback SPA a `index.html`, por lo que rutas como `/login` y `/panel` deben abrir correctamente.

## 4. Instalar el certificado en el celular

Debes copiar al teléfono:

- `.local-dev-certs/lan-root-ca.cer`

### iPhone

1. Abrir el archivo `.cer`.
2. Instalar el perfil de la CA raíz.
3. Ir a `Settings > General > About > Certificate Trust Settings`.
4. Activar confianza total para el certificado.

### Android

1. Copiar el `.cer` al teléfono.
2. Instalarlo como certificado de CA o de usuario según el flujo del sistema.
3. Confirmar que Chrome acepte el sitio HTTPS sin advertencia.

## 5. Flujo de prueba

1. Abrir `https://192.168.1.39:4200` en el teléfono.
2. Iniciar sesión como repartidor.
3. Instalar la PWA en pantalla de inicio.
4. Activar notificaciones desde el panel.
5. Crear un pedido nuevo en la tienda.
6. Verificar que llegue la notificación y que al tocarla abra `/panel?orderId=...`.

## Notas

- El frontend `lan` apunta al backend HTTPS de la IP LAN actual.
- Si cambia tu IP de Wi-Fi, hay que regenerar certificado y actualizar el `environment.lan.ts`.
- El backend ahora acepta CORS para `localhost` y para IPs privadas en desarrollo.
