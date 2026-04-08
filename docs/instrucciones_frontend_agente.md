# Frontend - Separación de Lógica (Arquitectura limpia)

## Contexto

Este documento define cómo estructurar el frontend para que:

- No contenga lógica de negocio crítica
- Sea completamente desacoplado del backend
- Funcione como consumidor de la API monolítica
- Sea escalable a múltiples aplicaciones (cliente, admin, repartidor)

Basado en el sistema SaaS de licorerías con delivery fileciteturn1file0

---

## 1. Principio clave

El frontend **NO implementa lógica de negocio**.

El frontend:
- Representa datos
- Orquesta interacción
- Consume API

El backend:
- Decide reglas
- Valida estados
- Controla permisos
- Calcula totales
- Maneja concurrencia

---

## 2. Qué significa “separar lógica del frontend”

Separar lógica significa:

### ❌ NO hacer en frontend
- Validar reglas de negocio complejas
- Calcular totales finales
- Determinar estados válidos de pedidos
- Decidir si un usuario puede ejecutar acciones
- Manejar concurrencia

### ✅ SÍ hacer en frontend
- Validaciones básicas de formulario
- Manejo de UI
- Estado visual
- Llamadas a API
- Transformación ligera de datos

---

## 3. Capas del frontend

### 3.1 Presentación (UI)

Componentes:

- Solo muestran datos
- No llaman directamente API
- No contienen lógica compleja

Ejemplo:
- product-card
- order-list
- order-status-badge

---

### 3.2 Contenedores (Smart components)

Responsables de:

- Orquestar flujos
- Llamar servicios
- Manejar estado local

Ejemplo:
- catalog-page
- admin-orders-page
- delivery-orders-page

---

### 3.3 Servicios (Data layer)

Encargados de:

- Llamar API
- Mapear respuestas
- Manejar errores

Ejemplo:

```ts
getOrders(): Observable<Order[]>
createOrder(payload): Observable<ApiResponse>
takeOrder(orderId): Observable<ApiResponse>
```

---

### 3.4 Core

Incluye:

- AuthService
- Interceptors
- Guards
- Configuración global
- Manejo de sesión

---

## 4. Flujo correcto (ejemplo pedido)

### Cliente crea pedido

1. Usuario agrega productos (UI)
2. Frontend arma payload
3. Envía POST /orders
4. Backend:
   - valida
   - calcula total
   - guarda
5. Frontend solo muestra resultado

---

### Repartidor toma pedido

1. Usuario presiona "Tomar pedido"
2. Frontend llama POST /orders/{id}/take
3. Backend decide:
   - si está disponible
   - si hay conflicto
4. Frontend maneja respuesta

Ejemplo:

```ts
if (error.status === 409) {
  mostrarMensaje("Este pedido ya fue tomado")
}
```

---

## 5. Multi-tenant en frontend

El sistema usa StoreId por tienda fileciteturn1file0

### Frontend debe:

- Detectar tenant desde URL
- Guardarlo en contexto
- Enviarlo en headers

```ts
headers: {
  "X-Store-Id": storeId
}
```

### Frontend NO debe:
- Validar acceso entre tiendas
- Filtrar seguridad

---

## 6. Manejo de estado

### Estado permitido en frontend:

- Usuario autenticado
- Carrito
- Tenant actual
- UI state

### Estado NO permitido:

- Reglas de negocio
- Estados válidos de dominio
- Permisos finales

---

## 7. Estructura recomendada

```text
core/
shared/
features/
  customer/
  admin/
  delivery/
```

---

## 8. Reglas obligatorias

1. Ningún componente usa HttpClient directamente
2. Todo acceso a API pasa por servicios
3. No duplicar lógica del backend
4. Manejar errores HTTP correctamente
5. Mantener componentes simples
6. Separar UI de lógica

---

## 9. Ejemplo de mala vs buena práctica

### ❌ Malo
```ts
if(order.status === 'Pending') {
  permitirTomarPedido()
}
```

### ✅ Bueno
```ts
backend decide
frontend solo muestra botón y maneja respuesta
```

---

## 10. Resultado esperado

El frontend debe ser:

- Delgado (thin client)
- Modular
- Escalable
- Fácil de mantener
- Independiente del backend

---

## 11. Prompt para agente frontend

```text
Refactoriza el frontend para eliminar lógica de negocio.

Reglas:
- Todo acceso a API debe ir en servicios
- Componentes solo UI
- No validar reglas complejas
- No calcular totales finales
- Manejar errores HTTP
- Implementar multi-tenant vía StoreId
- Usar Angular arquitectura modular

Objetivo:
Frontend desacoplado, limpio y mantenible.
```
