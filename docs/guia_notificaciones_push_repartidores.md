# Implementación de notificaciones push web para repartidores (Angular PWA + .NET)

## Objetivo

Implementar notificaciones push en una **web Angular** para que los repartidores reciban avisos de **nuevo pedido** directamente en su teléfono, sin necesidad de publicar una app en tiendas.

La solución debe funcionar como **PWA** y permitir que la notificación aparezca de forma similar a una notificación nativa del teléfono.

---

## Resumen del flujo

1. **La web Angular pide permiso para mostrar notificaciones.**
2. **El navegador crea una suscripción push.**
3. **Tu frontend le envía esa suscripción a tu backend.**
4. **Tu backend guarda esa suscripción asociada al repartidor.**
5. **Cuando hay un nuevo pedido, tu backend envía el push a esa suscripción.**
6. **El service worker de la PWA recibe el evento y muestra la notificación en el teléfono.** Angular maneja esto con `SwPush`, y la suscripción se obtiene con `requestSubscription()`.

---

## Alcance

Este documento cubre:

- Angular como **PWA**
- Uso de **Service Worker**
- Suscripción push desde frontend
- API .NET para persistir suscripciones
- Envío de notificaciones push desde backend
- Manejo de clic sobre notificación
- Recomendaciones de seguridad y operación

No cubre en profundidad:

- UI completa de delivery page
- Lógica de asignación avanzada de pedidos
- SMS/WhatsApp de respaldo
- Publicación en app stores

---

## Arquitectura propuesta

### Frontend
- Angular
- Angular Service Worker
- `SwPush`
- PWA instalada en el dispositivo del repartidor

### Backend
- ASP.NET Core Web API
- Base de datos relacional
- Servicio para guardar suscripciones push
- Servicio para enviar notificaciones push
- Opcional: Azure Service Bus / Azure Functions para desacoplar el envío

### Infraestructura mínima
- HTTPS obligatorio en producción
- Claves **VAPID** para Web Push
- Base de datos para persistir suscripciones por repartidor

---

## Flujo funcional detallado

### 1. El repartidor inicia sesión en la web
La `deliveryPage` identifica al repartidor autenticado.

### 2. La PWA solicita permiso de notificaciones
El frontend muestra una acción clara del tipo:

- "Activar notificaciones"
- "Recibir avisos de nuevos pedidos"

La solicitud de permiso debe hacerse idealmente desde una interacción del usuario.

### 3. Angular crea la suscripción push
Usar `SwPush.requestSubscription()` con la clave pública VAPID.

Resultado esperado:
- el navegador genera una `PushSubscription`
- esa suscripción contiene:
  - `endpoint`
  - claves criptográficas
  - metadatos necesarios para enviar el push

### 4. El frontend envía la suscripción al backend
El frontend debe mandar la `PushSubscription` al API .NET, junto con información del repartidor autenticado.

### 5. El backend guarda la suscripción
La suscripción se almacena vinculada al repartidor y al dispositivo/navegador actual.

### 6. Cuando hay un nuevo pedido
Cuando el sistema detecta un nuevo pedido asignado o visible para ese repartidor:

- se busca la o las suscripciones activas del repartidor
- el backend envía el push a esas suscripciones

### 7. El service worker recibe y muestra la notificación
El service worker de la PWA muestra una notificación del sistema con información como:

- título: `Nuevo pedido`
- cuerpo: `Tienes un pedido pendiente`
- icono
- datos de navegación, por ejemplo `orderId`

### 8. Al tocar la notificación
El service worker abre o enfoca la PWA y redirige a la pantalla del pedido.

---

## Decisión técnica recomendada

### Recomendación base
Implementar primero esto:

- **Angular PWA**
- **SwPush**
- **ASP.NET Core API**
- **Persistencia de PushSubscription**
- **Envío Web Push desde .NET**

### Evolución posterior opcional
Después se puede agregar:

- Azure Service Bus para desacoplar eventos
- Azure Functions para procesar `OrderCreated`
- Azure SignalR para sincronización en tiempo real cuando la web está abierta
- SMS como respaldo si el repartidor no atiende el pedido

---

## Requisitos técnicos

## Frontend Angular

### Requisitos
- Angular con soporte PWA
- Angular Service Worker habilitado
- `@angular/service-worker`
- Flujo de autenticación del repartidor ya existente

### Responsabilidades
- solicitar permiso de notificaciones
- obtener suscripción con `SwPush.requestSubscription()`
- enviar la suscripción al backend
- permitir reintento de suscripción
- detectar estado de suscripción si aplica

---

## Backend .NET

### Responsabilidades
- exponer endpoint para registrar suscripción push
- asociar suscripción a repartidor
- actualizar suscripción existente si cambia
- desactivar suscripciones inválidas
- enviar push cuando ocurra un evento de negocio

---

## Base de datos

### Tabla sugerida: `CourierPushSubscription`

Campos recomendados:

- `Id`
- `CourierId`
- `Endpoint`
- `P256DH`
- `Auth`
- `UserAgent`
- `DeviceName` (opcional)
- `CreatedAt`
- `UpdatedAt`
- `LastUsedAt`
- `IsActive`

### Restricciones sugeridas
- índice por `CourierId`
- índice único por `Endpoint`
- soft delete o marca de inactividad para suscripciones vencidas

---

## Contratos de API sugeridos

## 1. Registrar suscripción push

### Endpoint
`POST /api/push-subscriptions`

### Request body sugerido
```json
{
  "endpoint": "string",
  "p256dh": "string",
  "auth": "string",
  "userAgent": "string"
}
```

### Comportamiento
- obtener `CourierId` desde el token de autenticación o sesión
- insertar o actualizar la suscripción
- marcarla como activa

### Response sugerido
```json
{
  "success": true
}
```

---

## 2. Eliminar suscripción actual (opcional)

### Endpoint
`DELETE /api/push-subscriptions/current`

### Comportamiento
- desactivar la suscripción actual del navegador/dispositivo

---

## 3. Diagnóstico de suscripción (opcional)
Permite verificar si el repartidor ya cuenta con una suscripción activa.

### Endpoint
`GET /api/push-subscriptions/me`

---

## Flujo de implementación en Angular

## 1. Habilitar PWA
Agregar soporte PWA al proyecto Angular si aún no existe.

Objetivo:
- registrar service worker
- permitir notificaciones push
- tener manifiesto instalable

---

## 2. Crear un servicio de notificaciones push
Crear un servicio, por ejemplo:

- `push-notification.service.ts`

Responsabilidades:
- validar si `SwPush` está habilitado
- solicitar suscripción
- enviar la suscripción al backend

### Ejemplo de flujo lógico
```ts
if (!this.swPush.isEnabled) {
  // navegador no compatible o service worker no disponible
}

const subscription = await this.swPush.requestSubscription({
  serverPublicKey: environment.vapidPublicKey
});

// enviar subscription al backend
```

---

## 3. Solicitar permiso en una acción explícita del usuario
No disparar el permiso automáticamente al cargar la página.

Hacerlo mediante un botón como:

- `Activar notificaciones`
- `Recibir avisos de pedidos`

Esto mejora la tasa de aceptación y evita rechazos tempranos.

---

## 4. Guardar suscripción en backend
Del objeto `PushSubscription`, extraer y mandar:

- endpoint
- p256dh
- auth
- userAgent

---

## Ejemplo de estructura Angular sugerida

```text
src/
  app/
    core/
      services/
        push-notification.service.ts
    delivery/
      pages/
        delivery-home/
          delivery-home.component.ts
  environments/
    environment.ts
```

---

## Lógica sugerida del servicio Angular

### `PushNotificationService`
Métodos sugeridos:

- `subscribeCourierToPushNotifications()`
- `sendSubscriptionToBackend(subscription)`
- `isPushAvailable()`
- `unsubscribeCurrentDevice()` (opcional)

### Reglas
- no duplicar suscripciones innecesariamente
- manejar error si el usuario deniega permisos
- informar en UI si el navegador no soporta push

---

## Implementación backend .NET

## 1. Crear modelo de dominio / entidad
Crear una entidad para persistir la suscripción:

- `CourierPushSubscription`

## 2. Crear DTOs
Ejemplo:
- `RegisterPushSubscriptionRequest`

## 3. Crear controlador
Ejemplo:
- `PushSubscriptionsController`

## 4. Crear servicio de aplicación
Ejemplo:
- `IPushSubscriptionService`
- `PushSubscriptionService`

Responsabilidades:
- registrar
- actualizar
- obtener suscripciones activas por repartidor
- desactivar suscripciones inválidas

## 5. Crear servicio de envío
Ejemplo:
- `IWebPushSender`
- `WebPushSender`

Responsabilidades:
- construir payload
- enviar notificación push
- manejar errores de expiración / desuscripción
- desactivar endpoints inválidos

---

## Payload sugerido para la notificación

```json
{
  "title": "Nuevo pedido",
  "body": "Tienes un pedido pendiente por revisar",
  "icon": "/icons/icon-192x192.png",
  "badge": "/icons/badge.png",
  "url": "/delivery/orders/123",
  "orderId": 123,
  "storeName": "Sucursal Centro"
}
```

---

## Service Worker

## Responsabilidades
- escuchar evento push
- mostrar notificación
- manejar clic sobre la notificación
- abrir o enfocar la PWA en la ruta del pedido

## Comportamiento esperado
Cuando llega un push:

- mostrar notificación visible del sistema
- incluir `data.url`
- si el usuario toca la notificación:
  - abrir la PWA si está cerrada
  - enfocar la pestaña si ya está abierta
  - navegar al pedido correspondiente

---

## Integración con el evento de negocio

## Escenario simple
Cuando se crea un pedido y ya se sabe qué repartidor debe recibirlo:

1. se genera el evento de negocio (`OrderCreated` o `OrderAssigned`)
2. el backend obtiene `CourierId`
3. busca suscripciones activas del repartidor
4. envía push a cada suscripción activa

## Escenario recomendado
Separar la lógica en capas:

- `OrderService` crea el pedido
- `NotificationOrchestrator` decide a quién notificar
- `WebPushSender` ejecuta el envío

---

## Integración opcional con Azure

## Opción mínima
Sin Azure adicional para push:
- Angular PWA
- ASP.NET Core
- envío Web Push directo desde backend

## Opción desacoplada
Si ya van a usar Azure:

- `OrderCreated` -> Azure Service Bus
- Azure Function procesa el evento
- Azure Function busca suscripciones del repartidor
- Azure Function envía el Web Push
- Azure SignalR actualiza delivery page si está abierta

### Cuándo conviene
- si esperan crecer en volumen
- si quieren reintentos desacoplados
- si la creación del pedido no debe esperar ningún envío

---

## SignalR vs Push

## SignalR
Úsese para:
- actualizar la interfaz en tiempo real
- refrescar listado de pedidos
- marcar cambios inmediatamente si la web está abierta

## Push
Úsese para:
- avisar al repartidor aunque la web no esté al frente
- mostrar notificación visible del teléfono
- permitir entrada rápida al pedido al tocar la notificación

## Recomendación
Usar ambos:
- **Push** para llamar la atención del repartidor
- **SignalR** para mantener la UI sincronizada

---

## Casos de error a contemplar

### 1. Usuario deniega permisos
- mostrar instrucción para habilitar notificaciones manualmente
- dejar registro de que no está suscrito

### 2. Suscripción expirada o inválida
- al fallar el envío, marcar `IsActive = false`
- pedir re-suscripción en siguiente acceso

### 3. Repartidor con varios dispositivos
- permitir varias suscripciones activas por `CourierId`

### 4. Sesión cambiada
- si el dispositivo cambia de repartidor, invalidar o reasignar según reglas del negocio

---

## Seguridad

- exigir autenticación para registrar suscripciones
- nunca confiar en `CourierId` enviado desde el frontend si ya puede derivarse del token
- registrar auditoría básica de altas/bajas de suscripciones
- proteger claves privadas VAPID
- no exponer la clave privada al frontend

---

## Checklist de implementación

## Frontend
- [ ] Habilitar Angular PWA
- [ ] Registrar service worker
- [ ] Crear `PushNotificationService`
- [ ] Solicitar permiso desde acción explícita
- [ ] Obtener suscripción con `requestSubscription()`
- [ ] Enviar suscripción al backend
- [ ] Mostrar estado de activación en la UI

## Backend
- [ ] Crear entidad `CourierPushSubscription`
- [ ] Crear migración de base de datos
- [ ] Crear endpoint `POST /api/push-subscriptions`
- [ ] Crear servicio para guardar suscripciones
- [ ] Crear servicio de envío Web Push
- [ ] Manejar expiración de suscripciones inválidas

## Negocio
- [ ] Disparar push cuando exista nuevo pedido para repartidor
- [ ] Definir payload estándar de notificación
- [ ] Abrir pantalla de pedido al tocar la notificación

---

## Recomendación final

Para este proyecto, la estrategia más práctica es:

1. Mantener la solución como **web Angular**
2. Convertir `deliveryPage` en **PWA**
3. Implementar **Push Notifications** para avisos al repartidor
4. Usar **SignalR** como complemento para sincronizar la UI cuando la web ya esté abierta
5. Dejar **SMS** solo como respaldo si más adelante hace falta

Esto permite evitar la publicación en tiendas, conservar una implementación relativamente simple y ofrecer una experiencia suficientemente cercana a una notificación nativa del teléfono.

---

## Entregables esperados del agente desarrollador

1. Angular PWA configurada
2. Servicio de suscripción push con `SwPush`
3. Endpoint backend para registrar suscripciones
4. Persistencia por repartidor
5. Servicio backend para envío de Web Push
6. Service worker mostrando la notificación y abriendo el pedido
7. Flujo completo probado desde creación de pedido hasta recepción de notificación
