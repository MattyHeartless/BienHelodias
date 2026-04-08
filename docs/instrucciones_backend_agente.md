# Instrucciones para el agente de backend

## Objetivo
Diseñar e implementar el backend de una plataforma SaaS para licorerías con delivery, donde:

- El frontend web esté desacoplado del backend.
- El backend sea una **API monolítica** en **ASP.NET Core Web API**.
- La API use **Controllers**.
- La solución respete el enfoque de **Clean Architecture**.
- El sistema soporte **multi-tenant por tienda**.
- La autenticación sea con **JWT**.
- El backend atienda inicialmente la Web y deje preparado el camino para futuras apps adicionales.

Basado en el documento base de la plataforma SaaS para licorerías con delivery. No se procesan pagos; el sistema solo gestiona pedidos.

---

## 1) Alcance funcional inicial

Implementar el backend para cubrir estos módulos del MVP:

### Roles
- Cliente
- Licorería
- Repartidor
- Super Admin

### Funcionalidades mínimas
- Autenticación y autorización
- Gestión de tiendas
- Gestión de productos
- Gestión de pedidos
- Asignación de repartidor
- Cambio de estados del pedido
- Multi-tenant por tienda
- Exposición de endpoints REST para Web

### Restricción importante
- **No procesar pagos**
- El sistema solo gestiona pedidos y flujo operativo

---

## 2) Decisión arquitectónica

### Patrón
Construir una sola solución backend monolítica con separación interna por capas:

- **API**
- **Application**
- **Domain**
- **Infrastructure**

### Criterio
Aunque sea monolito, debe estar preparado para escalar funcionalmente sin acoplar lógica de negocio con infraestructura.

### Regla clave
El frontend no debe contener lógica de negocio crítica.  
Toda regla de negocio debe vivir en backend.

---

## 3) Separación frontend vs backend

### Frontend
El frontend web debe ser un consumidor HTTP puro de la API.

Debe encargarse solo de:
- Renderizado UI
- Manejo de sesión/token
- Formularios
- Navegación
- Consumo de endpoints
- Estado visual

### Backend
El backend debe encargarse de:
- Autenticación
- Autorización por rol
- Resolución de tenant
- Validaciones de negocio
- Flujo de pedidos
- Asignación segura de repartidores
- Persistencia
- Auditoría y trazabilidad básica

### Regla de frontera
Nada del frontend debe asumir lógica como:
- si un pedido puede cambiar de estado
- si un repartidor puede tomar un pedido
- si un producto pertenece a una tienda
- si un usuario puede ver datos de otra tienda

Eso debe validarse siempre en backend.

---

## 4) Stack esperado

### Backend
- .NET 8 o versión LTS vigente
- ASP.NET Core Web API
- **Controllers** (no Minimal APIs)
- Entity Framework Core
- **SQL Server**
- JWT Bearer Authentication
- Swagger/OpenAPI
- AutoMapper opcional
- Serilog para logging opcional pero recomendado

### Exclusiones
- **No usar FluentValidation**

### Base de datos
Modelar inicialmente para:
- Stores
- Products
- Orders
- OrderItems
- DeliveryUsers
- Users

---

## 5) Estructura sugerida del repositorio backend

```text
src/
  LiquorSaaS.Api/
  LiquorSaaS.Application/
  LiquorSaaS.Domain/
  LiquorSaaS.Infrastructure/

tests/
  LiquorSaaS.UnitTests/
  LiquorSaaS.IntegrationTests/
```

### Responsabilidades

#### Domain
Contiene:
- Entidades
- Enums
- Value Objects
- Reglas de negocio puras
- Interfaces de repositorio si decides declararlas aquí

#### Application
Contiene:
- Casos de uso
- DTOs
- Commands / Queries
- Validaciones
- Contratos de servicios
- Lógica de orquestación

#### Infrastructure
Contiene:
- EF Core DbContext
- Repositorios
- Configuraciones ORM
- JWT
- Servicios externos
- Implementaciones de persistencia

#### API
Contiene:
- Controllers
- Configuración DI
- Middleware
- Autenticación/autorización
- Swagger
- Resolución de tenant

---

## 6) Diseño multi-tenant

El tenant está ligado a la tienda y su URL incluye `StoreId`.

### Instrucción de implementación
Implementar multi-tenant a nivel lógico, no físico, para el MVP.

### Estrategia recomendada
Cada entidad de negocio asociada a tienda debe llevar `StoreId`.

Ejemplos:
- Products → StoreId
- Orders → StoreId
- DeliveryUsers → StoreId si aplica por tienda, o relación configurable
- Usuarios administrativos → StoreId

### Resolución del tenant
Soportar estas formas, en este orden:
1. Header `X-Store-Id`
2. Claim del JWT cuando aplique
3. Ruta si el endpoint lo requiere

### Regla obligatoria
Toda consulta o comando que afecte datos de negocio debe filtrar por `StoreId`.

### Objetivo
Evitar fuga de información entre tiendas.

---

## 7) Modelo de dominio mínimo

### Entidades principales

#### Store
Campos sugeridos:
- Id
- Name
- Slug
- IsActive
- SubscriptionStatus
- CreatedAt

#### Product
- Id
- StoreId
- Name
- Description
- Price
- Stock
- ImageUrl
- IsActive
- Category
- CreatedAt
- UpdatedAt

#### Order
- Id
- StoreId
- CustomerName
- CustomerPhone
- DeliveryAddress
- Notes
- Status
- DeliveryUserId nullable
- Total
- CreatedAt
- UpdatedAt

#### OrderItem
- Id
- OrderId
- ProductId
- ProductNameSnapshot
- UnitPrice
- Quantity
- Subtotal

#### DeliveryUser
- Id
- FullName
- Phone
- Email
- IsActive
- CurrentAvailability
- CreatedAt

#### User
- Id
- Name
- Email
- PasswordHash
- Role
- StoreId nullable para SuperAdmin
- IsActive

---

## 8) Estados del pedido

Implementar los estados:

```csharp
Pending,
Accepted,
Preparing,
Ready,
OnTheWay,
Delivered,
Cancelled
```

### Regla
No permitir saltos arbitrarios.

### Máquina de estados sugerida
- Pending → Accepted | Cancelled
- Accepted → Preparing | Cancelled
- Preparing → Ready | Cancelled
- Ready → OnTheWay
- OnTheWay → Delivered
- Delivered → terminal
- Cancelled → terminal

### Validación
Toda transición debe pasar por un servicio de dominio o aplicación.

---

## 9) Lógica crítica: toma de pedido por repartidor

Debe existir **bloqueo transaccional para evitar doble asignación**.

### Instrucción obligatoria
Implementar la toma de pedido como operación atómica.

### Reglas
- Solo pedidos disponibles pueden tomarse
- Solo un repartidor puede tomar un pedido
- La operación debe ser transaccional
- Debe devolver error de concurrencia si otro repartidor lo tomó antes

### Ejemplo esperado
- Verificar que el pedido esté en estado válido
- Ejecutar update condicional dentro de transacción
- Si `rows affected == 0`, responder `409 Conflict`

### Referencia de SQL esperada
```sql
UPDATE Orders
SET DeliveryUserId = @UserId
WHERE Id = @OrderId
  AND DeliveryUserId IS NULL;
```

### Resultado esperado
Evitar doble asignación incluso bajo concurrencia real.

---

## 10) API REST inicial

### Auth
```http
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/register-admin
POST   /api/auth/register-delivery
```

### Stores
```http
GET    /api/stores/{id}
POST   /api/stores
PUT    /api/stores/{id}
GET    /api/stores
```

### Products
```http
GET    /api/products
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}
PATCH  /api/products/{id}/status
```

### Orders
```http
GET    /api/orders
GET    /api/orders/{id}
POST   /api/orders
PATCH  /api/orders/{id}/status
POST   /api/orders/{id}/take
POST   /api/orders/{id}/release
```

### Delivery
```http
GET    /api/delivery/orders/available
GET    /api/delivery/orders/mine
PATCH  /api/delivery/availability
```

### Admin / SuperAdmin
```http
GET    /api/admin/dashboard
GET    /api/superadmin/stores
PATCH  /api/superadmin/stores/{id}/subscription
```

---

## 11) Autenticación y autorización

### JWT
Implementar JWT con claims mínimos:
- `sub`
- `email`
- `role`
- `storeId` cuando aplique

### Roles
- Customer
- StoreAdmin
- DeliveryUser
- SuperAdmin

### Políticas sugeridas
- `RequireStoreAdmin`
- `RequireDeliveryUser`
- `RequireSuperAdmin`

### Regla de seguridad
Nunca confiar solo en el role; también validar pertenencia del recurso al `StoreId`.

---

## 12) Contratos de integración con frontend

### Formato estándar recomendado
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {},
  "errors": []
}
```

### Errores
Usar códigos HTTP correctos:
- `200` OK
- `201` Created
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict
- `422` Unprocessable Entity
- `500` Internal Server Error

### Paginación
Para listados:
- `page`
- `pageSize`
- `total`
- `items`

---

## 13) Reglas de negocio mínimas

### Productos
- Solo la tienda dueña puede crear/editar/desactivar sus productos
- No exponer productos inactivos al cliente

### Pedidos
- Un cliente crea pedido con snapshot de producto y precio
- El total se calcula en backend
- No confiar en montos enviados por frontend

### Repartidores
- Solo pueden tomar pedidos disponibles
- Solo pueden actualizar pedidos asignados a ellos
- No pueden ver pedidos de otras tiendas salvo regla explícita del negocio

### Super Admin
- Puede gestionar negocios y suscripciones

---

## 14) Casos de uso que debe implementar el agente

### Auth
- LoginUser
- GenerateJwtToken

### Products
- CreateProduct
- UpdateProduct
- DeleteProduct
- GetStoreProducts
- GetPublicCatalog

### Orders
- CreateOrder
- GetOrderById
- GetStoreOrders
- UpdateOrderStatus
- AssignDeliveryUserToOrder
- GetAvailableOrders
- GetDeliveryOrders

### Stores
- CreateStore
- UpdateStore
- GetStoreById

### SuperAdmin
- ListStores
- UpdateSubscriptionStatus

---

## 15) Base de datos y persistencia

### Reglas de modelado
- Índices por `StoreId`
- Índices por `Order.Status`
- Índices por `DeliveryUserId`
- Constraints para integridad referencial
- Soft delete opcional para productos y tiendas

### Migraciones
El agente debe entregar:
- Migración inicial
- Seed básico para pruebas
- Configuración para desarrollo local

---

## 16) Observabilidad y auditoría

### Logging
Registrar como mínimo:
- Login exitoso/fallido
- Creación de pedido
- Cambio de estado
- Toma de pedido por repartidor
- Errores de concurrencia
- Errores de autorización

### Auditoría mínima
Guardar:
- Fecha de creación
- Fecha de actualización
- Usuario que ejecutó cambio relevante, si aplica

---

## 17) Calidad y pruebas

### Tests mínimos

#### Unit tests
- Validación de transición de estados
- Cálculo de total del pedido
- Reglas de autorización de dominio/aplicación

#### Integration tests
- Login
- Crear producto
- Crear pedido
- Tomar pedido con concurrencia
- Cambiar estado
- Filtrado por tenant

### Caso crítico de prueba
Simular dos repartidores intentando tomar el mismo pedido al mismo tiempo.  
Solo uno debe lograrlo.

---

## 18) Entregables esperados del agente de backend

### Fase 1
- Solución .NET monolítica creada
- Clean Architecture base
- Configuración JWT
- Configuración DbContext
- Migración inicial

### Fase 2
- Módulo Auth
- Módulo Products
- Módulo Orders
- Módulo Delivery

### Fase 3
- Multi-tenant enforcement
- Validaciones
- Logs
- Swagger completo
- Tests críticos

### Fase 4
- Dockerización opcional
- Variables de entorno
- README técnico
- Colección Postman o Swagger usable

---

## 19) Criterios de aceptación

El backend se considera correcto si:

- El frontend web puede consumir todo por API REST
- No existe lógica crítica dependiente del frontend
- La API es monolítica pero modular internamente
- El sistema respeta multi-tenant por tienda
- JWT y roles funcionan correctamente
- La toma de pedidos evita doble asignación
- Los estados de pedido son controlados
- No se procesan pagos
- Swagger documenta todos los endpoints relevantes

---

## 20) Prompt listo para tu agente de backend

```text
Necesito que implementes el backend de una plataforma SaaS para licorerías con delivery.

Objetivo:
- Separar frontend y backend
- El frontend será una Web consumiendo una API
- El backend debe ser una API monolítica en ASP.NET Core Web API
- La API debe usar Controllers
- Debe seguir Clean Architecture
- Debe usar JWT Authentication
- Debe soportar multi-tenant por tienda mediante StoreId
- Debe usar SQL Server
- No usar FluentValidation
- No debe procesar pagos, solo gestionar pedidos

Roles:
- Cliente
- Licorería / StoreAdmin
- Repartidor
- SuperAdmin

Módulos mínimos:
- Auth
- Stores
- Products
- Orders
- Delivery
- Admin/SuperAdmin

Modelo base:
- Stores
- Products
- Orders
- OrderItems
- DeliveryUsers
- Users

Estados del pedido:
Pending, Accepted, Preparing, Ready, OnTheWay, Delivered, Cancelled

Requisito crítico:
Implementar la toma de pedido por repartidor con control de concurrencia para evitar doble asignación.
Debe hacerse con operación atómica/transaccional.
Si dos repartidores intentan tomar el mismo pedido, solo uno debe poder hacerlo.

Arquitectura esperada:
- API
- Application
- Domain
- Infrastructure

Reglas:
- Toda regla de negocio vive en backend
- El frontend solo consume endpoints
- Toda consulta y comando debe respetar StoreId
- No permitir acceso cruzado entre tiendas
- Calcular totales en backend
- Validar cambios de estado en backend

Quiero que entregues:
1. Estructura de solución
2. Entidades y enums
3. DbContext y configuraciones
4. Migración inicial
5. Endpoints REST con Controllers
6. JWT y autorización por roles
7. Casos de uso principales
8. Implementación de multi-tenant
9. Lógica de concurrencia para tomar pedidos
10. Swagger
11. Tests unitarios e integración
12. README técnico para correr el proyecto

Prioriza primero un MVP funcional y limpio.
```
