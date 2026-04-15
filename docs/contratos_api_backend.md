# Contratos API Backend

Documento de contratos HTTP para el backend de `LiquorSaaS`.

Base path:

```text
/api
```

## Convenciones generales

### Auth

- Header JWT:

```http
Authorization: Bearer <token>
```

### Tenant

Para endpoints multi-tenant, el backend resuelve la tienda en este orden:

1. Header `X-Store-Id`
2. Claim `storeId` del JWT
3. Parametro de ruta `storeId` si existiera

Header recomendado cuando aplique:

```http
X-Store-Id: 6f514f4d-a00c-4580-88f4-a3c85c7f24db
```

### Envelope de respuesta

Todas las respuestas exitosas usan este formato:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {},
  "errors": []
}
```

Errores:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    "Specific validation error"
  ]
}
```

### Paginacion

Listados paginados:

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "items": []
}
```

### Serializacion de enums

El backend actualmente serializa enums como enteros.

`OrderStatus`:

- `0` = `Pending`
- `1` = `Accepted`
- `2` = `Preparing`
- `3` = `Ready`
- `4` = `OnTheWay`
- `5` = `Delivered`
- `6` = `Cancelled`

`SubscriptionStatus`:

- `0` = `Trial`
- `1` = `Active`
- `2` = `Suspended`
- `3` = `Cancelled`

`UserRole`:

- `0` = `Customer`
- `1` = `StoreAdmin`
- `2` = `DeliveryUser`
- `3` = `SuperAdmin`

`DeliveryAvailability`:

- `0` = `Unavailable`
- `1` = `Available`
- `2` = `Busy`

## DTOs principales

### AuthTokenDto

```json
{
  "accessToken": "jwt-token",
  "expiresAtUtc": "2026-04-08T20:00:00Z",
  "userId": "f4c088f0-c4cf-4bfe-ad57-44df5d4b78ce",
  "email": "admin@bienhelodias.local",
  "role": 1,
  "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
  "deliveryUserId": null
}
```

### StoreDto

```json
{
  "id": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
  "name": "Bien Helodias Centro",
  "slug": "bien-helodias-centro",
  "welcomePhrase": "La mejor seleccion para tu noche.",
  "isActive": true,
  "subscriptionStatus": 1,
  "createdAtUtc": "2026-04-08T18:00:00Z"
}
```

### StoreAdminDto

```json
{
  "id": "f4c088f0-c4cf-4bfe-ad57-44df5d4b78ce",
  "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
  "name": "Store Admin",
  "email": "admin@bienhelodias.local",
  "isActive": true,
  "createdAtUtc": "2026-04-08T18:00:00Z"
}
```

### ProductDto

```json
{
  "id": "c41f8981-15b1-4eb3-9481-70da2d5dd407",
  "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
  "name": "Gin Botanico Premium",
  "description": "Gin premium para catalogo inicial",
  "price": 45.00,
  "stock": 50,
  "category": "Gin",
  "imageUrl": null,
  "isActive": true,
  "createdAtUtc": "2026-04-08T18:00:00Z",
  "updatedAtUtc": "2026-04-08T18:00:00Z"
}
```

### BannerDto

```json
{
  "bannerId": "9f3ca497-58dd-4bc4-a500-7c49fda9de0b",
  "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
  "header": "Happy Hour",
  "title": "2x1 en botellas",
  "description": "Solo por hoy",
  "wildcard": "2x1",
  "expirationDate": "2026-04-30T23:59:59Z",
  "status": true,
  "created": "2026-04-15T18:30:00Z"
}
```

### OrderItemDto

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "productId": "c41f8981-15b1-4eb3-9481-70da2d5dd407",
  "productNameSnapshot": "Gin Botanico Premium",
  "unitPrice": 45.00,
  "quantity": 2,
  "subtotal": 90.00
}
```

### OrderDto

```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
  "customerName": "Cliente Test",
  "customerPhone": "55555",
  "deliveryAddress": "Av Principal 123",
  "notes": "Sin hielo",
  "status": 0,
  "deliveryUserId": null,
  "total": 70.00,
  "createdAtUtc": "2026-04-08T18:00:00Z",
  "updatedAtUtc": "2026-04-08T18:00:00Z",
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "productId": "c41f8981-15b1-4eb3-9481-70da2d5dd407",
      "productNameSnapshot": "Gin Botanico Premium",
      "unitPrice": 45.00,
      "quantity": 1,
      "subtotal": 45.00
    }
  ]
}
```

### DeliveryUserDto

```json
{
  "id": "d5f31cc0-79ec-4567-94f8-b0bdd497721e",
  "userId": "fd7e73e0-8895-4b7a-b4cb-2be398f1fc62",
  "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
  "fullName": "Delivery Rider",
  "phone": "+520000000000",
  "email": "delivery@bienhelodias.local",
  "isActive": true,
  "currentAvailability": 1
}
```

### DashboardDto

```json
{
  "totalProducts": 10,
  "activeProducts": 8,
  "totalOrders": 50,
  "pendingOrders": 5,
  "readyOrders": 7,
  "onTheWayOrders": 3,
  "revenueInOrders": 12450.50
}
```

## Auth

### POST `/api/auth/login`

Auth: publica

Request:

```json
{
  "email": "admin@bienhelodias.local",
  "password": "Admin123!"
}
```

Response `200 OK`:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "jwt-token",
    "expiresAtUtc": "2026-04-08T20:00:00Z",
    "userId": "f4c088f0-c4cf-4bfe-ad57-44df5d4b78ce",
    "email": "admin@bienhelodias.local",
    "role": 1,
    "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
    "deliveryUserId": null
  },
  "errors": []
}
```

### POST `/api/auth/refresh`

Auth: requerida

Request:

```json
{}
```

Response `200 OK`: mismo contrato que `login`.

### POST `/api/auth/register-admin`

Auth: `SuperAdmin`

Request:

```json
{
  "name": "Nuevo Admin",
  "email": "nuevo.admin@store.local",
  "password": "Admin123!",
  "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db"
}
```

Response `201 Created`: `ApiResponse<AuthTokenDto>`

### POST `/api/auth/register-delivery`

Auth: requerida

Notas:

- Si quien llama es `StoreAdmin`, `storeId` puede ser `null`.
- Si quien llama es `SuperAdmin`, debe enviar `storeId`.

Request:

```json
{
  "name": "Driver 2",
  "email": "driver2@test.local",
  "password": "Admin123!",
  "phone": "5555",
  "storeId": null
}
```

Response `201 Created`: `ApiResponse<AuthTokenDto>`

## Stores

### GET `/api/stores/{id}`

Auth: requerida

Path params:

- `id`: `guid`

Response `200 OK`: `ApiResponse<StoreDto>`

### POST `/api/stores`

Auth: requerida

Nota:

- La logica actual solo permite crear tiendas a `SuperAdmin`.

Request:

```json
{
  "name": "Store 2",
  "slug": "store-2",
  "subscriptionStatus": 1,
  "welcomePhrase": "Promo de bienvenida toda la semana."
}
```

Response `201 Created`: `ApiResponse<StoreDto>`

### PUT `/api/stores/{id}`

Auth: requerida

Request:

```json
{
  "name": "Bien Helodias Centro",
  "slug": "bien-helodias-centro",
  "isActive": true,
  "welcomePhrase": "Entrega express y promos del dia."
}
```

Response `200 OK`: `ApiResponse<StoreDto>`

### GET `/api/stores?page=1&pageSize=20`

Auth: requerida

Query params:

- `page`: `int`
- `pageSize`: `int`

Response `200 OK`:

```json
{
  "success": true,
  "message": "Stores retrieved successfully.",
  "data": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "items": [
      {
        "id": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
        "name": "Bien Helodias Centro",
        "slug": "bien-helodias-centro",
        "welcomePhrase": "La mejor seleccion para tu noche.",
        "isActive": true,
        "subscriptionStatus": 1,
        "createdAtUtc": "2026-04-08T18:00:00Z"
      }
    ]
  },
  "errors": []
}
```

## Products

### GET `/api/products?page=1&pageSize=20`

Auth: requerida

Tenant:

- `StoreAdmin`: usa claim `storeId`
- `SuperAdmin`: debe enviar `X-Store-Id`

Response `200 OK`: `ApiResponse<PagedResult<ProductDto>>`

### GET `/api/products/catalog?page=1&pageSize=20`

Auth: publica

Tenant:

- Requiere `X-Store-Id`

Response `200 OK`: `ApiResponse<PagedResult<ProductDto>>`

### GET `/api/products/{id}`

Auth: publica

Tenant:

- Requiere `X-Store-Id`

Response `200 OK`: `ApiResponse<ProductDto>`

### POST `/api/products`

Auth: requerida

Tenant:

- `StoreAdmin`: claim `storeId`
- `SuperAdmin`: `X-Store-Id`

Request:

```json
{
  "name": "Mezcal Joven",
  "description": "Lote de prueba",
  "price": 88.50,
  "stock": 20,
  "category": "Mezcal",
  "imageUrl": null
}
```

Response `201 Created`: `ApiResponse<ProductDto>`

### PUT `/api/products/{id}`

Auth: requerida

Request:

```json
{
  "name": "Mezcal Joven",
  "description": "Lote de prueba actualizado",
  "price": 92.00,
  "stock": 18,
  "category": "Mezcal",
  "imageUrl": null,
  "isActive": true
}
```

Response `200 OK`: `ApiResponse<ProductDto>`

### DELETE `/api/products/{id}`

Auth: requerida

Response `200 OK`:

```json
{
  "success": true,
  "message": "Product deleted successfully.",
  "data": null,
  "errors": []
}
```

### PATCH `/api/products/{id}/status`

Auth: requerida

Request:

```json
{
  "isActive": false
}
```

Response `200 OK`: `ApiResponse<ProductDto>`

## Banners

### GET `/api/banners?page=1&pageSize=20`

Auth: requerida

Tenant:

- `StoreAdmin`: claim `storeId`
- `SuperAdmin`: debe enviar `X-Store-Id`

Response `200 OK`: `ApiResponse<PagedResult<BannerDto>>`

### GET `/api/banners/active?page=1&pageSize=20`

Auth: publica

Tenant:

- Requiere `X-Store-Id`

Notas:

- Solo devuelve banners con `status = true`
- Excluye banners expirados

Response `200 OK`: `ApiResponse<PagedResult<BannerDto>>`

### GET `/api/banners/{id}`

Auth: publica

Tenant:

- Requiere `X-Store-Id`

Response `200 OK`: `ApiResponse<BannerDto>`

### POST `/api/banners`

Auth: requerida

Tenant:

- `StoreAdmin`: claim `storeId`
- `SuperAdmin`: `X-Store-Id`

Request:

```json
{
  "header": "Happy Hour",
  "title": "2x1 en botellas",
  "description": "Solo por hoy",
  "wildcard": "2x1",
  "expirationDate": "2026-04-30T23:59:59Z",
  "status": true
}
```

Response `201 Created`: `ApiResponse<BannerDto>`

### PUT `/api/banners/{id}`

Auth: requerida

Request:

```json
{
  "header": "Promo actualizada",
  "title": "3x2 en mixologia",
  "description": "Valido hasta agotar existencias",
  "wildcard": "3x2",
  "expirationDate": "2026-05-05T23:59:59Z",
  "status": true
}
```

Response `200 OK`: `ApiResponse<BannerDto>`

### DELETE `/api/banners/{id}`

Auth: requerida

Response `200 OK`:

```json
{
  "success": true,
  "message": "Banner deleted successfully.",
  "data": null,
  "errors": []
}
```

### PATCH `/api/banners/{id}/status`

Auth: requerida

Request:

```json
{
  "status": false
}
```

Response `200 OK`: `ApiResponse<BannerDto>`

## Orders

### GET `/api/orders?page=1&pageSize=20&status=3`

Auth: requerida

Query params:

- `page`: `int`
- `pageSize`: `int`
- `status`: `OrderStatus?`

Response `200 OK`: `ApiResponse<PagedResult<OrderDto>>`

### GET `/api/orders/{id}`

Auth: requerida

Response `200 OK`: `ApiResponse<OrderDto>`

### POST `/api/orders`

Auth: publica

Tenant:

- Requiere `X-Store-Id`

Request:

```json
{
  "customerName": "Cliente Test",
  "customerPhone": "55555",
  "deliveryAddress": "Av Principal 123",
  "notes": "Sin hielo",
  "items": [
    {
      "productId": "c41f8981-15b1-4eb3-9481-70da2d5dd407",
      "quantity": 1
    },
    {
      "productId": "4db30dbb-c9d3-46e6-ae65-1173ef7be9fc",
      "quantity": 2
    }
  ]
}
```

Response `201 Created`: `ApiResponse<OrderDto>`

### PATCH `/api/orders/{id}/status`

Auth: requerida

Notas:

- `StoreAdmin` y `SuperAdmin` pueden avanzar estados segun la maquina de estados.
- `DeliveryUser` solo puede marcar como `Delivered` un pedido asignado a el.
- No se permiten saltos arbitrarios.

Request:

```json
{
  "status": 1
}
```

Ejemplos de `status`:

- `1` `Accepted`
- `2` `Preparing`
- `3` `Ready`
- `5` `Delivered`

Response `200 OK`: `ApiResponse<OrderDto>`

### POST `/api/orders/{id}/take`

Auth: `DeliveryUser`

Notas:

- Usa control atomico para evitar doble asignacion.
- Solo debe funcionar para pedidos `Ready`.
- Si otro repartidor lo toma antes, devuelve conflicto.

Request:

```json
{}
```

Response `200 OK`: `ApiResponse<OrderDto>`

Error esperado `409 Conflict`:

```json
{
  "success": false,
  "message": "Order is no longer available.",
  "data": null,
  "errors": []
}
```

### POST `/api/orders/{id}/release`

Auth: requerida

Notas:

- Permitido para `DeliveryUser`, `StoreAdmin` y `SuperAdmin`.

Request:

```json
{}
```

Response `200 OK`: `ApiResponse<OrderDto>`

## Delivery

### GET `/api/delivery/orders/available?page=1&pageSize=20`

Auth: `DeliveryUser`

Response `200 OK`: `ApiResponse<PagedResult<OrderDto>>`

### GET `/api/delivery/orders/mine?page=1&pageSize=20`

Auth: `DeliveryUser`

Response `200 OK`: `ApiResponse<PagedResult<OrderDto>>`

### PATCH `/api/delivery/availability`

Auth: `DeliveryUser`

Request:

```json
{
  "availability": 1
}
```

Ejemplos:

- `0` `Unavailable`
- `1` `Available`
- `2` `Busy`

Response `200 OK`: `ApiResponse<DeliveryUserDto>`

## Admin

### GET `/api/admin/dashboard`

Auth: requerida

Notas:

- La implementacion actual permite `StoreAdmin` y `SuperAdmin`.
- Responde datos agregados de la tienda resuelta por tenant.

Response `200 OK`:

```json
{
  "success": true,
  "message": "Dashboard retrieved successfully.",
  "data": {
    "totalProducts": 2,
    "activeProducts": 2,
    "totalOrders": 5,
    "pendingOrders": 1,
    "readyOrders": 2,
    "onTheWayOrders": 1,
    "revenueInOrders": 350.00
  },
  "errors": []
}
```

## SuperAdmin

### GET `/api/superadmin/stores?page=1&pageSize=20`

Auth: `SuperAdmin`

Response `200 OK`: `ApiResponse<PagedResult<StoreDto>>`

### GET `/api/superadmin/stores/{id}/admins`

Auth: `SuperAdmin`

Path params:

- `id`: `guid`

Response `200 OK`:

```json
{
  "success": true,
  "message": "Store admins retrieved successfully.",
  "data": [
    {
      "id": "f4c088f0-c4cf-4bfe-ad57-44df5d4b78ce",
      "storeId": "6f514f4d-a00c-4580-88f4-a3c85c7f24db",
      "name": "Store Admin",
      "email": "admin@bienhelodias.local",
      "isActive": true,
      "createdAtUtc": "2026-04-08T18:00:00Z"
    }
  ],
  "errors": []
}
```

### PATCH `/api/superadmin/stores/{id}/subscription`

Auth: `SuperAdmin`

Request:

```json
{
  "subscriptionStatus": 2
}
```

Ejemplos:

- `0` `Trial`
- `1` `Active`
- `2` `Suspended`
- `3` `Cancelled`

Response `200 OK`: `ApiResponse<StoreDto>`

## Codigos de error esperados

- `200 OK`
- `201 Created`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`
- `500 Internal Server Error`
