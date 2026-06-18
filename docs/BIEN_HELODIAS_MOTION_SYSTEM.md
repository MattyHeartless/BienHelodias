# BIEN HELODIAS — MOTION_SYSTEM.md

Version: 1.0  
Fecha: Junio 2026  
Uso: Documento operativo para guiar a un agente IA / Codex / Cursor en la implementación del sistema de motion de la showcase de Bien Helodias.

---

# 1. Objetivo del Motion System

La showcase de Bien Helodias debe dejar de sentirse como una página estática con mucho texto y convertirse en una experiencia visual viva, premium y editorial.

El motion no debe ser decorativo. Debe comunicar:

- velocidad
- delivery
- pedidos vivos
- tecnología
- frescura
- operación moderna
- energía nocturna/social

La página debe sentirse como una marca tecnológica para licorerías, no como documentación SaaS.

---

# 2. Principio rector

## Show, don't tell.

Cada sección debe explicar visualmente lo que hace Bien Helodias.

El movimiento debe reemplazar parte del texto.

En vez de decir:

> "Gestiona pedidos, entregas y promociones desde un solo sistema."

Mostrar:

- una card de pedido entrante
- una card de repartidor en camino
- una promo activa
- un mockup de storefront
- un dashboard flotando

---

# 3. Referencia visual

La referencia principal es el video de Bento / Linktree proporcionado por el usuario.

No se debe copiar el contenido.

Se debe replicar la sensación:

- composiciones visuales densas
- secciones con personalidad propia
- tarjetas tipo bento
- mockups flotantes
- cambios de layout por scroll
- imágenes como protagonistas
- texto corto y contundente
- movimiento sutil, no caótico

---

# 4. Personalidad del movimiento

El motion de Bien Helodias debe sentirse:

- fluido
- nocturno
- premium
- juguetón pero no infantil
- tecnológico pero no frío
- enérgico pero no agresivo

Evitar:

- rebotes exagerados
- animaciones tipo caricatura
- partículas innecesarias
- transiciones demasiado rápidas
- exceso de efectos 3D
- loaders pesados

---

# 5. Stack recomendado

Para Angular:

## Opción recomendada

Usar `framer-motion` si el proyecto lo permite mediante integración compatible, o una librería equivalente para Angular.

## Opción Angular-friendly

Usar:

- Angular Animations
- CSS keyframes
- IntersectionObserver
- requestAnimationFrame para parallax sutil
- GSAP si se requiere control avanzado

## Recomendación práctica

Si el agente IA tiene dudas, implementar con:

- CSS keyframes para floating loops
- IntersectionObserver para scroll reveal
- Angular animations para entradas
- CSS transitions para hover
- GSAP solo para parallax o secuencias complejas

---

# 6. Motion tokens

## Duraciones

```css
--motion-fast: 180ms;
--motion-base: 320ms;
--motion-slow: 600ms;
--motion-section: 800ms;
--motion-float: 7000ms;
--motion-float-slow: 11000ms;
```

## Easing

```css
--ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out-soft: cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring-soft: cubic-bezier(0.34, 1.56, 0.64, 1);
```

## Distancias

```css
--reveal-y: 32px;
--reveal-y-lg: 56px;
--hover-lift: -8px;
--float-y: 12px;
--float-x: 8px;
--tilt-sm: 2deg;
--tilt-md: 4deg;
```

---

# 7. Animaciones base

## 7.1 Scroll Reveal

Uso:

- títulos
- cards
- mockups
- secciones
- estadísticas

Estado inicial:

```css
opacity: 0;
transform: translateY(32px);
```

Estado visible:

```css
opacity: 1;
transform: translateY(0);
```

Timing:

```css
duration: 600ms;
easing: var(--ease-out-soft);
```

Regla:

Los elementos de una misma sección deben aparecer en stagger.

Stagger recomendado:

```text
80ms - 140ms entre elementos
```

---

## 7.2 Floating Loop

Uso:

- botellas
- tarjetas de pedido
- tarjetas de repartidor
- mockups
- globos visuales
- mapas miniatura

Keyframe:

```css
@keyframes float-soft {
  0% {
    transform: translate3d(0, 0, 0) rotate(var(--rotate-start, 0deg));
  }
  50% {
    transform: translate3d(var(--float-x, 8px), -12px, 0) rotate(var(--rotate-end, 2deg));
  }
  100% {
    transform: translate3d(0, 0, 0) rotate(var(--rotate-start, 0deg));
  }
}
```

Duración:

```text
7s - 11s
```

Importante:

Cada elemento flotante debe tener duración distinta para que no se muevan todos al mismo tiempo.

Ejemplo:

```css
.hero-card.order {
  animation: float-soft 7s ease-in-out infinite;
}

.hero-card.driver {
  animation: float-soft 9s ease-in-out infinite;
}

.hero-bottle {
  animation: float-soft 11s ease-in-out infinite;
}
```

---

## 7.3 Hover Lift

Uso:

- bento cards
- botones
- cards de tiendas afiliadas
- mockups
- cards de beneficio

Estado hover:

```css
transform: translateY(-8px) scale(1.02);
```

Timing:

```css
transition: transform 320ms var(--ease-out-soft), box-shadow 320ms var(--ease-out-soft);
```

Glow opcional:

```css
box-shadow: 0 0 40px rgba(210, 253, 110, 0.12);
```

No usar sombras negras fuertes.

---

## 7.4 Lime Pulse

Uso:

- CTA principal
- puntos de tracking
- badge de pedido activo
- indicador de "en camino"

Keyframe:

```css
@keyframes lime-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(210, 253, 110, 0.28);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(210, 253, 110, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(210, 253, 110, 0);
  }
}
```

Duración:

```text
2.4s - 3.2s
```

Uso moderado.

No aplicar a todos los elementos.

---

## 7.5 Marquee / Ticker

Uso:

- banda de categorías
- marcas de bebidas ficticias
- beneficios cortos
- estados de pedidos

Ejemplo:

```text
PEDIDOS EN LÍNEA · DELIVERY · PROMOS · CATÁLOGO · REPARTIDORES ·
```

Movimiento:

```css
@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
```

Duración:

```text
18s - 32s
```

La velocidad debe ser lenta y elegante.

---

# 8. Hero Motion

El hero es la parte más importante.

Debe sentirse vivo desde el primer segundo.

---

## 8.1 Estructura visual

Layout recomendado:

```text
Izquierda:
- badge pequeño
- headline grande
- subheadline corto
- CTAs

Derecha:
- mockup principal
- tarjetas flotantes
- botella/producto flotante
- mini mapa / tracking
- pedido entrante
```

---

## 8.2 Elementos del hero

### Mockup principal

Contenido sugerido:

- storefront de una licorería
- catálogo
- carrito
- checkout
- tracking

Motion:

- entrada con fade + translateY
- inclinación leve: rotate(2deg)
- floating loop muy lento

---

### Card 1: Pedido recibido

Copy:

```text
Pedido recibido
Corona 12 Pack · $249
```

Motion:

- aparece 600ms después del mockup
- floating loop
- lime pulse en badge

---

### Card 2: Repartidor en camino

Copy:

```text
Repartidor en camino
ETA 12 min
```

Motion:

- aparece 800ms después del mockup
- floating loop inverso
- pequeño dot animado

---

### Card 3: Promo activa

Copy:

```text
Promo activa
2x1 en seleccionados
```

Motion:

- aparece 1000ms después del mockup
- hover lift
- brillo lime sutil

---

### Producto flotante

Ejemplos visuales:

- lata
- botella
- six-pack
- bolsa de entrega

Motion:

- float lento
- rotate leve
- parallax mínimo al mover cursor o hacer scroll

---

## 8.3 Secuencia de entrada del hero

Orden:

1. badge
2. headline
3. subheadline
4. CTAs
5. mockup
6. card pedido
7. card repartidor
8. card promo
9. producto flotante

Timing:

```text
0ms badge
120ms headline
240ms subheadline
360ms CTAs
500ms mockup
650ms card pedido
800ms card repartidor
950ms card promo
1100ms producto flotante
```

---

## 8.4 Loop del hero

Después de la entrada inicial:

- tarjetas flotan
- badge de pedido pulsa
- mockup se mueve levemente
- producto rota 1-3 grados
- nada debe distraer de la CTA

---

# 9. Secciones y motion por sección

---

## 9.1 Trust Band

Objetivo:

Dar credibilidad sin robar protagonismo.

Elementos:

- pedidos procesados
- tiendas afiliadas
- ciudades activas
- repartidores

Motion:

- contador animado de 0 al valor final
- reveal en stagger

Ejemplo:

```text
0 → 2,500 pedidos
0 → 12 tiendas
0 → 3 ciudades
```

Duración contador:

```text
900ms - 1400ms
```

---

## 9.2 Problema

No usar párrafos largos.

Convertir en tarjetas visuales.

Cards:

- WhatsApp saturado
- pedidos perdidos
- entregas sin control
- promociones manuales

Motion:

- cada card entra desde abajo
- stagger 100ms
- hover lift

Visual:

Cada card debe tener icono o mini ilustración.

---

## 9.3 Solución

Tres bento cards grandes:

1. Cliente compra
2. Negocio administra
3. Repartidor entrega

Motion:

- cards aparecen con scroll reveal
- mockups internos flotan
- al hover se eleva la card

Cada card debe tener máximo:

- título
- 1 línea de texto
- 3 chips

---

## 9.4 Cómo funciona

Timeline visual horizontal en desktop.

```text
Afíliate → Configura → Vende → Entrega → Crece
```

Mobile:

Timeline vertical.

Motion:

- línea se dibuja con scroll
- pasos aparecen uno por uno
- iconos flotan levemente

Implementación simple:

- IntersectionObserver
- aplicar clase `.is-visible`
- animar `scaleX` de la línea
- stagger de items

---

## 9.5 Ecosistema

Mostrar tres pantallas:

- Storefront
- Admin
- Delivery

Layout:

- mockups superpuestos
- cards alrededor
- fondo con shape orgánica lime

Motion:

- mockup central entra primero
- laterales entran con delay
- cards flotan
- parallax sutil al scroll

---

## 9.6 Negocios afiliados

Debe ser discreto, no marketplace invasivo.

Mostrar 3 a 6 cards.

Motion:

- entrada en stagger
- hover con zoom leve de imagen
- badge "Miembro de la red" con lime pulse sutil solo al hover

Card:

```text
Logo / imagen
Nombre
Ciudad
Categoría
CTA: Ver tienda
```

Regla:

No convertir esta sección en directorio gigante.

---

## 9.7 Filosofía de marca

Sección más emocional.

Texto corto.

Ejemplo:

```text
No vendemos software para cualquier negocio.
Creamos tecnología para quienes venden bien helodias.
```

Visual:

- fotografía nocturna
- bebida fría
- glow lime
- composición editorial

Motion:

- texto entra con reveal
- imagen tiene parallax lento
- overlay orgánico se mueve ligeramente

---

## 9.8 Afiliación

Sección orientada a conversión.

Visual:

- card de formulario
- card de beneficios
- mini checklist
- mockup pequeño

Motion:

- formulario entra desde abajo
- beneficios aparecen en stagger
- CTA tiene hover glow

No saturar con planes si todavía no están definidos.

Usar copy:

```text
Solicita información y te ayudamos a definir el mejor esquema para tu negocio.
```

---

## 9.9 CTA Final

Debe ser fuerte y simple.

Headline:

```text
Lleva tu licorería a internet.
```

Subheadline:

```text
Únete a la red de negocios que venden, administran y entregan con Bien Helodias.
```

Motion:

- fondo con wave orgánica suave
- CTA con lime pulse muy sutil
- cards decorativas flotantes en los bordes

---

# 10. Reglas de reducción de texto

La implementación actual tiene demasiado texto.

Aplicar estas reglas:

## Regla 1

Cada sección debe tener máximo:

- 1 headline
- 1 subheadline corto
- 3 a 5 elementos visuales
- máximo 3 bullets

---

## Regla 2

Si hay más de 2 párrafos en una sección, está mal.

---

## Regla 3

Cada bloque textual debe poder leerse en menos de 5 segundos.

---

## Regla 4

Por cada bloque de texto debe existir un elemento visual que lo explique.

---

# 11. Patrones visuales obligatorios

El agente debe implementar al menos:

- hero con elementos flotantes
- scroll reveal
- stagger de cards
- hover lift
- contadores animados
- bento grid visual
- mockups superpuestos
- sección de afiliados discreta
- CTA final animado

No entregar una versión estática.

No dejar placeholders de animación.

---

# 12. CSS base recomendado

```css
:root {
  --motion-fast: 180ms;
  --motion-base: 320ms;
  --motion-slow: 600ms;
  --motion-section: 800ms;
  --motion-float: 7000ms;
  --motion-float-slow: 11000ms;

  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-soft: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring-soft: cubic-bezier(0.34, 1.56, 0.64, 1);

  --lime-punch: #D2FD6E;
  --deep-charcoal: #0E0E0E;
  --surface-low: #131313;
  --surface-high: #1F2020;
  --surface-highest: #262626;
}
```

```css
.motion-reveal {
  opacity: 0;
  transform: translateY(32px);
  transition:
    opacity var(--motion-slow) var(--ease-out-soft),
    transform var(--motion-slow) var(--ease-out-soft);
}

.motion-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.motion-hover-lift {
  transition:
    transform var(--motion-base) var(--ease-out-soft),
    box-shadow var(--motion-base) var(--ease-out-soft);
}

.motion-hover-lift:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 0 40px rgba(210, 253, 110, 0.12);
}

.motion-float {
  animation: float-soft var(--motion-float) ease-in-out infinite;
}

.motion-float-slow {
  animation: float-soft var(--motion-float-slow) ease-in-out infinite;
}

@keyframes float-soft {
  0% {
    transform: translate3d(0, 0, 0) rotate(var(--rotate-start, 0deg));
  }
  50% {
    transform: translate3d(var(--float-x, 8px), -12px, 0) rotate(var(--rotate-end, 2deg));
  }
  100% {
    transform: translate3d(0, 0, 0) rotate(var(--rotate-start, 0deg));
  }
}

@keyframes lime-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(210, 253, 110, 0.28);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(210, 253, 110, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(210, 253, 110, 0);
  }
}
```

---

# 13. IntersectionObserver recomendado

Usar una directiva Angular o servicio reutilizable.

Comportamiento:

- observar elementos con clase `.motion-reveal`
- cuando entran al viewport, agregar `.is-visible`
- usar threshold `0.12`
- usar rootMargin `0px 0px -10% 0px`
- animar una sola vez por defecto

Pseudocódigo:

```ts
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,
    rootMargin: '0px 0px -10% 0px'
  }
);
```

---

# 14. Contadores animados

Implementar para la trust band.

Pseudocódigo:

```ts
animateCounter(element, target, duration = 1200) {
  const start = 0;
  const startTime = performance.now();

  const update = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(start + (target - start) * eased);

    element.textContent = value.toLocaleString('es-MX');

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
}
```

---

# 15. Performance

El motion debe ser fluido.

Reglas:

- animar `transform` y `opacity`
- evitar animar `top`, `left`, `width`, `height`
- usar `will-change` solo en elementos animados importantes
- no usar videos pesados sin optimización
- respetar `prefers-reduced-motion`

---

# 16. Accesibilidad

Implementar soporte para usuarios con reducción de movimiento.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }

  .motion-reveal {
    opacity: 1 !important;
    transform: none !important;
  }
}
```

---

# 17. Checklist de aceptación

La página rediseñada solo se considera correcta si cumple:

- [ ] El hero tiene al menos 4 elementos visuales animados.
- [ ] Hay floating cards reales.
- [ ] Hay scroll reveal real.
- [ ] Hay stagger real en cards.
- [ ] Hay hover lift en tarjetas.
- [ ] Hay contadores animados.
- [ ] El texto total se redujo al menos 60%.
- [ ] Cada sección tiene un elemento visual dominante.
- [ ] La sección de afiliados es discreta.
- [ ] La página no se siente como documentación.
- [ ] La página no se siente como marketplace invasivo.
- [ ] La CTA principal siempre es afiliar negocio.
- [ ] El consumidor puede descubrir tiendas, pero de forma secundaria.
- [ ] Las animaciones respetan `prefers-reduced-motion`.

---

# 18. Prompt corto para el agente IA

Usar este prompt junto con el archivo:

```text
Rediseña la showcase de Bien Helodias siguiendo este MOTION_SYSTEM.md. La página actual tiene demasiado texto y se siente estática. Quiero que se sienta como una experiencia visual tipo Bento/Linktree: más mockups, más cards, más movimiento, menos explicación. Implementa animaciones reales: floating hero cards, scroll reveal, stagger, hover lift, contadores y mockups superpuestos. No dejes placeholders ni comentarios. Respeta el diseño unificado de Bien Helodias y conserva la conversión principal: afiliar negocios.
```

---

# 19. Prompt estricto para evitar resultados estáticos

```text
Antes de terminar, valida que la página tenga animaciones reales implementadas en código. Si solo agregaste clases sin keyframes, placeholders, comentarios o TODOs, el trabajo está incompleto. Debe existir movimiento visible en el hero, entrada animada por scroll, hover lift en tarjetas y contadores animados. Reduce texto y reemplaza explicación con visuales.
```

---

# 20. Resumen

El motion de Bien Helodias debe hacer que la plataforma se sienta viva.

La página no debe explicar demasiado.

Debe demostrar.

El visitante debe entender en segundos:

- vendo bebidas
- recibo pedidos
- administro mi operación
- coordino entregas
- puedo afiliarme

Y todo debe sentirse como una marca moderna, nocturna, tecnológica y memorable.
