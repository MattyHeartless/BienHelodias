# LiquorSaaS Backend

Backend monolítico en ASP.NET Core Web API para el MVP de una plataforma SaaS de licorerías con delivery.

## Stack

- .NET 8
- ASP.NET Core Web API con Controllers
- Clean Architecture por capas
- Entity Framework Core
- SQL Server
- JWT Bearer Authentication
- Swagger / OpenAPI
- Serilog

## Estructura

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

## Funcionalidad incluida

- Auth con JWT
- Stores
- Products
- Orders
- Delivery
- Admin / SuperAdmin
- Multi-tenant lógico por `StoreId`
- Validación de estados de pedido
- Toma de pedido con `UPDATE` condicional para evitar doble asignación
- Seed básico para desarrollo

## Tenant resolution

Orden de resolución:

1. Header `X-Store-Id`
2. Claim `storeId` del JWT
3. Ruta `storeId` si existe

## Endpoints principales

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/register-admin`
- `POST /api/auth/register-delivery`
- `GET /api/stores`
- `POST /api/stores`
- `GET /api/products`
- `GET /api/products/catalog`
- `POST /api/products`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/{id}/status`
- `POST /api/orders/{id}/take`
- `POST /api/orders/{id}/release`
- `GET /api/delivery/orders/available`
- `GET /api/delivery/orders/mine`
- `PATCH /api/delivery/availability`
- `GET /api/admin/dashboard`
- `GET /api/superadmin/stores`
- `PATCH /api/superadmin/stores/{id}/subscription`

## Credenciales seed

- SuperAdmin
  - `superadmin@liquorsaas.local`
  - `Admin123!`
- StoreAdmin
  - `admin@bienhelodias.local`
  - `Admin123!`
- DeliveryUser
  - `delivery@bienhelodias.local`
  - `Admin123!`

## Cómo correr

1. Usa como raíz de trabajo la carpeta `backend/`.
2. Revisa la cadena de conexión en `src/LiquorSaaS.Api/appsettings.json` si necesitas cambiar servidor o credenciales.
3. Restaura dependencias:

```powershell
dotnet restore
```

4. Aplica migraciones:

```powershell
dotnet ef database update --project src\LiquorSaaS.Infrastructure\LiquorSaaS.Infrastructure.csproj --startup-project src\LiquorSaaS.Api\LiquorSaaS.Api.csproj
```

5. Ejecuta la API:

```powershell
dotnet run --project src\LiquorSaaS.Api\LiquorSaaS.Api.csproj
```

6. Abre Swagger:

```text
https://localhost:xxxx/swagger
```

## Herramientas EF

Se agregó manifiesto local en `.config/dotnet-tools.json` con `dotnet-ef 8.0.17`.

Migración inicial:

- `src/LiquorSaaS.Infrastructure/Persistence/Migrations/20260408180121_InitialCreate.cs`

## Pruebas

```powershell
dotnet test LiquorSaaS.sln
```

Cobertura actual:

- Unit tests
  - transición de estados
  - cálculo de total
  - restricción de `StoreId` para usuarios no `SuperAdmin`
- Integration tests
  - login
  - crear producto
  - crear pedido
  - cambio de estado
  - filtrado por tenant
  - concurrencia al tomar pedido

## Estado actual

La base `LiquorSaaSDb` ya fue creada en `localhost` y la migración inicial quedó aplicada correctamente usando autenticación SQL.
