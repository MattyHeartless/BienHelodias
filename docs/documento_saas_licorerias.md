# 📄 Documento Base -- Plataforma SaaS de Licorerías con Delivery Autónomo

## 1. 🧩 Resumen del Sistema

Plataforma web SaaS que permite a licorerías: - Tener su página
personalizada (white-label) - Gestionar su catálogo de productos -
Recibir pedidos de clientes - Publicar pedidos en un pool de
repartidores disponibles - Permitir que repartidores tomen pedidos
libremente - Generar tráfico mediante QR y marketing

📌 Importante: El sistema NO procesa pagos, solo gestiona pedidos.

## 2. 🎯 Objetivo del Producto

Crear una plataforma donde: - Las licorerías aumenten ventas sin
comisiones - Los repartidores trabajen de forma flexible - El sistema
monetice vía suscripción + marketing

## 3. 🏗️ Arquitectura General

Frontend (Angular) 3 aplicaciones independientes: 1. Cliente 2. Admin
(Licorería) 3. Repartidor

Backend (.NET) - ASP.NET Core Web API - Clean Architecture - JWT
Authentication - Multi-tenant por tienda

Base de datos - SQL Server / PostgreSQL

## 4. 👥 Roles del Sistema

### Cliente

-   Navega catálogo
-   Genera pedidos

### Licorería

-   Administra productos
-   Recibe pedidos

### Repartidor

-   Ve pedidos disponibles
-   Puede tomar pedidos
-   Gestiona entrega

### Super Admin

-   Gestiona negocios
-   Controla suscripciones

## 5. 🔄 Flujo Principal (Actualizado)

1.  Usuario entra al sitio (QR o link)
2.  Selecciona productos
3.  Genera pedido
4.  Pedido entra en estado: "Pendiente"
5.  Repartidores ven lista de pedidos disponibles
6.  Repartidor toma pedido
7.  Pedido cambia a: "Tomado"
8.  Repartidor recoge en tienda
9.  Entrega al cliente
10. Pedido finalizado

## 6. 🔁 Estados del Pedido

Pending, Accepted, Preparing, Ready, OnTheWay, Delivered, Cancelled

## 7. 🧱 Módulos del Sistema

Cliente: catálogo, carrito, checkout Licorería: CRUD productos, pedidos
Repartidor: pedidos disponibles, tomar pedido, estados Backend: APIs

## 8. 🗄️ Modelo de Datos

Stores, Products, Orders, OrderItems, DeliveryUsers

## 9. 🔐 Seguridad

JWT Authentication y roles

## 10. 🌐 Multi-Tenant

URL por tienda con StoreId

## 11. 📲 QR por Tienda

QR único por negocio

## 12. 💰 Monetización

Suscripción + marketing

## 13. 🚀 Fases

MVP → tracking → IA

## 14. ⚠️ Consideraciones

Bloqueo transaccional para evitar doble asignación

## 15. 🧠 Lógica Crítica

UPDATE Orders SET DeliveryUserId = @UserId WHERE Id = @OrderId AND
DeliveryUserId IS NULL

## 16. 🔌 Endpoints

/auth, /orders, /products

## 17. 🎨 Angular

Cliente, Admin, Repartidor apps

## 18. 🔥 Diferenciador

Infraestructura de ventas para licorerías

## 19. 🧠 Evolución

Red de repartidores + bares + experiencias

## 20. ✅ Conclusión

Sistema listo para escalar
