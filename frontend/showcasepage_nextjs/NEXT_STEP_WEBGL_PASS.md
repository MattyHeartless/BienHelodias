# Next Step: Visual Polish + Hero Escalation

Este es el siguiente paso guardado para la version Next.js de Bien Helodias.

## Objetivo

Hacer una tercera pasada enfocada en acabado premium, no en estructura:

1. Refinar tipografia y espaciado por breakpoint.
2. Pulir micro-coreografias del hero.
3. Elevar una sola escena a WebGL real en lugar de canvas atmosferico.

## Alcance recomendado

### 1. Tipografia y ritmo

- Ajustar `font-size`, `line-height` y `letter-spacing` del hero, trust, manifesto y CTA final.
- Afinar paddings verticales para que la narrativa respire mejor en desktop.
- Corregir escalas en mobile para que no se sienta apretado ni sobredimensionado.

### 2. Motion polish

- Mejorar entrada del hero con una secuencia mas cinematica.
- Hacer que header, watermark y paneles del hero entren con offsets distintos.
- Reforzar hover states premium en CTAs y links clave.

### 3. Una escena WebGL real

Escoger solo una:

- Hero
- CTA final

No ambas al mismo tiempo en esta pasada.

#### Opcion recomendada

Hero WebGL:

- Fondo liquido/nocturno reactivo al puntero.
- Desplazamiento lento con sensacion de tension.
- Colores de marca: charcoal, lime, wine, cobalt.
- Mantener fallback a la capa canvas actual si `prefers-reduced-motion` o si WebGL falla.

## Implementacion sugerida

### Si se hace rapido

- Mantener `GSAP`.
- Reemplazar `AtmosphereCanvas` del hero por un componente `HeroWebGLScene`.
- Dejar `AtmosphereCanvas` actual en CTA final.

### Si se hace bien

- Crear componente cliente independiente:
  - `src/components/hero-webgl-scene.tsx`
- Encapsular:
  - init WebGL
  - resize
  - pointer interaction
  - cleanup
  - fallback

## Criterio de done

- El hero ya no se siente solo como layout con imagenes, sino como escena viva.
- El motion deja de ser correcto y pasa a sentirse dirigido.
- Mobile mantiene legibilidad y control.
- El sitio sigue compilando sin warnings de implementacion.
