# Bien Helodias: idea actual del negocio

> Documento de referencia para construir la nueva página showcase de la marca.  
> Basado en la documentación y el código actual del proyecto al 15 de junio de 2026.

## 1. Qué es Bien Helodias hoy

Bien Helodias es una plataforma digital para licorerías y negocios de bebidas que quieren vender en línea con su propia presencia de marca, operar pedidos de delivery y administrar su operación desde un panel web.

No está planteado como un marketplace genérico. El enfoque actual es que cada negocio tenga su propia tienda digital dentro de la plataforma, con catálogo, promociones, pedidos, seguimiento y operación de repartidores.

En términos de producto, Bien Helodias combina:

- storefront para clientes finales
- panel administrativo para la tienda
- panel para repartidores
- backend multi-tenant para operar varias tiendas
- capa SaaS para dar de alta negocios y gestionar suscripciones

## 2. Idea central del negocio

La idea del negocio es darle a una licorería una infraestructura lista para vender por internet sin tener que desarrollar su propio sistema.

Eso significa que el negocio cliente obtiene:

- una página pública para recibir pedidos
- un catálogo administrable
- control de productos, stock y estados
- gestión de pedidos en tiempo real
- operación de repartidores
- promociones y banners comerciales
- seguimiento del pedido para el cliente

Y Bien Helodias monetiza ese sistema como plataforma.

## 3. Problema que resuelve

Hoy la propuesta resuelve varios problemas típicos de una licorería o negocio de bebidas:

- depender solo de WhatsApp o llamadas para tomar pedidos
- no tener una vitrina digital propia
- no tener claridad sobre pedidos activos y entregas
- no contar con un flujo digital para delivery
- no poder escalar campañas, promociones y recompra
- depender de terceros que se quedan con la relación con el cliente

Bien Helodias busca que la tienda venda más y opere mejor, pero sin perder su identidad ni su control comercial.

## 4. Propuesta de valor

La propuesta de valor actual se puede resumir así:

**“Tu tienda de bebidas, lista para vender en línea, administrar pedidos y mover entregas desde un solo sistema.”**

Los beneficios más claros hoy son:

- presencia digital propia por tienda
- operación centralizada
- experiencia de compra más moderna
- seguimiento del pedido para el cliente
- administración simple para el negocio
- delivery más coordinado
- capacidad de crecer a múltiples tiendas dentro del mismo sistema

## 5. A quién va dirigido

El negocio hoy está orientado principalmente a:

- licorerías
- depósitos
- vinaterías
- minisúpers con venta de bebidas
- negocios locales de delivery de alcohol y bebidas

También puede extenderse después a otros comercios de conveniencia o consumo inmediato, pero el enfoque actual de marca y producto está claramente construido alrededor de bebidas frías, licor y delivery local.

## 6. Cómo funciona el modelo actual

### Para el cliente final

El cliente entra a la tienda pública de una licorería por medio de un slug o URL personalizada.

Desde ahí puede:

- ver el catálogo
- explorar categorías
- buscar productos
- agregar al carrito
- aplicar promociones
- capturar datos de entrega
- hacer el pedido
- seguir el estado del pedido hasta la entrega

### Para la tienda

La licorería entra a un panel administrativo donde puede:

- revisar métricas básicas
- administrar productos
- activar o desactivar productos
- ver pedidos
- configurar su tienda
- editar frase de bienvenida
- crear banners
- crear promociones
- dar de alta repartidores

### Para el repartidor

El repartidor entra a un panel dedicado donde puede:

- ver pedidos disponibles
- tomar pedidos
- ver sus pedidos asignados
- cambiar su disponibilidad
- abrir navegación en Google Maps si hay coordenadas
- marcar pedidos como entregados
- recibir notificaciones push de nuevos pedidos en dispositivos compatibles

### Para Bien Helodias como plataforma

Existe un rol de superadmin que permite:

- crear tiendas
- editar tiendas
- ver administradores por tienda
- dar de alta administradores
- cambiar el estado de suscripción

Esto confirma que el producto ya está planteado como SaaS multi-negocio, no solo como una app para una sola licorería.

## 7. Qué ya está implementado en el producto

Con base en el código actual, estas capacidades ya forman parte real del sistema:

### Storefront / tienda pública

- carga de tienda por `slug`
- catálogo público por tienda
- carrito persistente por tienda
- checkout con nombre, teléfono y dirección
- integración con Google Places para autocompletar dirección
- soporte de coordenadas de entrega
- banners promocionales en la portada/catálogo
- aplicación de códigos promocionales
- seguimiento del pedido con estados

### Panel admin de la tienda

- login
- dashboard con métricas
- CRUD de productos
- manejo de stock
- activación/desactivación de productos
- consulta de pedidos
- detalle de pedidos con timeline
- edición de frase de bienvenida
- gestión de banners
- promociones porcentuales
- promociones tipo 2x1 ligadas a producto
- alta y activación de repartidores

### Panel repartidor

- login
- perfil actual
- pedidos disponibles
- pedidos asignados
- toma/liberación de pedidos
- disponibilidad: no disponible, disponible, ocupado
- marcado de entrega
- navegación a destino con Google Maps
- notificaciones push para nuevos pedidos

### Plataforma SaaS / superadmin

- listado de tiendas
- alta de nuevas tiendas
- edición de tienda
- administración de admins por tienda
- actualización de suscripción

## 8. Qué vende realmente Bien Helodias

Aunque visualmente la marca habla de “frías” y “bien helodias”, el negocio no vende bebidas directamente como marca propia.

Lo que Bien Helodias vende hoy es:

- software para licorerías
- infraestructura digital de venta
- operación de pedidos y delivery
- presencia white-label o semi white-label por tienda
- herramientas comerciales para empujar ventas

En otras palabras:

**Bien Helodias es una marca tecnológica para el canal de licorerías y bebidas.**

## 9. Modelo de ingresos planteado

La documentación actual apunta a un modelo de monetización basado en:

- suscripción por negocio
- marketing o activaciones comerciales

La lógica del sistema también refleja estados de suscripción por tienda, lo que refuerza que el ingreso principal esperado es recurrente.

## 10. Qué NO parece ser el enfoque actual

Para que la página showcase no venda algo distinto al producto real, conviene dejar claro lo que hoy no es central:

- no es un e-commerce generalista para cualquier categoría
- no es un marketplace abierto tipo agregador masivo
- no está centrado en pagos integrados como propuesta principal
- no está planteado como app de consumidor masivo multi-tienda desde una sola portada

El corazón actual es: **cada licorería usa Bien Helodias para vender mejor.**

## 11. Diferenciador de marca

Lo que diferencia a Bien Helodias no es solo la funcionalidad, sino la forma en que la presenta.

La marca tiene una identidad muy clara:

- cercana
- relajada
- con humor ligero
- social
- nocturna
- asociada al momento ideal de consumo: la bebida bien fría

“Bien helodia” no es solo un nombre. Es el concepto emocional del producto: entregar bebidas en su punto ideal, rápido, fácil y con buena vibra.

Esto le da a la plataforma un tono distinto al SaaS tradicional. No habla como software corporativo; habla como una marca con cultura, calle y contexto social.

## 12. Posicionamiento recomendado para la showcase

Si la página nueva quiere representar fielmente el negocio actual, el posicionamiento debería girar alrededor de esta idea:

**Bien Helodias es la plataforma que ayuda a licorerías y negocios de bebidas a vender en línea, gestionar pedidos y coordinar entregas con una experiencia moderna y una marca con personalidad.**

También se puede condensar en variantes como:

- La infraestructura digital para vender bebidas en línea.
- Tu licorería en internet, lista para recibir pedidos.
- El sistema para vender, administrar y entregar tus bien helodias.

## 13. Mensajes clave para la nueva página

Estos son los mensajes más alineados con el estado actual del producto:

### Qué es

Bien Helodias es una plataforma SaaS para licorerías y negocios de bebidas con storefront, administración y delivery.

### Qué resuelve

Centraliza ventas, pedidos, catálogo, promociones y entregas en un solo sistema.

### Cómo opera

Cada tienda tiene su propio espacio para vender; el negocio administra; el repartidor ejecuta; el cliente da seguimiento.

### Qué gana el negocio

- más orden operativo
- mejor presencia digital
- más control de sus pedidos
- mejor experiencia para el cliente
- capacidad de crecer sobre una base tecnológica propia

### Qué hace distinta a la marca

Une tecnología para delivery con una identidad fresca, local y memorable.

## 14. Estructura sugerida para contar la idea en la showcase

### 1. Hero

Presentar a Bien Helodias como la plataforma para que licorerías vendan en línea y operen su delivery.

### 2. El problema

Explicar que muchos negocios siguen tomando pedidos de forma manual o dispersa.

### 3. La solución

Mostrar los tres frentes:

- tienda para cliente
- panel admin
- panel repartidor

### 4. Cómo funciona

- registra tu tienda
- publica tu catálogo
- recibe pedidos
- coordina entrega
- da seguimiento

### 5. Funciones clave

- catálogo
- carrito y checkout
- seguimiento de pedido
- banners y promociones
- dashboard
- repartidores
- notificaciones push

### 6. Modelo SaaS

Explicar que Bien Helodias puede operar múltiples negocios desde una misma plataforma.

### 7. CTA final

Invitar a registrar la tienda, solicitar alta o pedir demo.

## 15. Resumen ejecutivo

Bien Helodias hoy es un SaaS vertical para licorerías y negocios de bebidas. Su propuesta no es solo “hacer una página”, sino darles un sistema completo para vender en línea, gestionar su operación y coordinar entregas con una identidad de marca distintiva.

La showcase nueva debería vender esa doble capa:

- la capa funcional: catálogo, pedidos, admin, delivery, promociones
- la capa emocional: bebidas bien frías, experiencia ágil, marca con personalidad

## 16. Frase síntesis

**Bien Helodias convierte a una licorería en una operación digital lista para vender, administrar y entregar sus bebidas con marca propia y flujo moderno.**
