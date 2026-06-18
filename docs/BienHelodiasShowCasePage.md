# Bien Helodias — Unified Brand Landing Design System

> **Base:** Bento-style playful structure from `DESIGN.md`  
> **Alignment layer:** Current Bien Helodias visual identity from `current_DESIGN.md`  
> **Goal:** Build the public brand page that explains what Bien Helodias is, how it works, and how stores can register, while staying visually consistent with the current landing, admin, and delivery apps.

---

## 1. Creative North Star

Bien Helodias should feel like a **premium alcohol delivery SaaS with party energy**.

The unified direction is:

**Dark Liquid Bento**

This combines two ideas:

1. **Bento / Pop-art clarity**
   - Rounded cards.
   - High-contrast layouts.
   - Modular sections that explain the product clearly.
   - Strong CTA moments.
   - Playful sticker-like composition.

2. **Bien Helodias current identity**
   - Deep charcoal base.
   - Lime Punch as the conversion accent.
   - Premium liquor / nightlife atmosphere.
   - Organic, fluid green shapes.
   - Glassmorphism for modern SaaS/product UI.
   - No generic SaaS template look.

The final brand page should not copy the light Bento look literally. Instead, it should borrow its **bold modularity, rounded geometry, big typography, and memorable cards**, then translate them into Bien Helodias’ current dark, premium, liquid visual language.

---

## 2. Product Narrative for the Brand Page

The page must communicate:

- **What Bien Helodias is:** a platform for liquor stores, alcohol delivery, and local beverage commerce.
- **How it works for customers:** browse, order, track, receive.
- **How it works for businesses:** register store, upload products, manage orders, receive sales.
- **Why it is valuable:** fast setup, modern storefront, admin dashboard, delivery flow, promotions, push notifications, and scalable SaaS model.
- **What action to take:** register / request access / start selling.

### Suggested Page Story

1. **Hero**
   - “Tu tienda de bebidas, lista para vender en línea.”
   - Explain that Bien Helodias helps liquor stores receive online orders and manage deliveries.
   - CTA: “Dar de alta mi negocio”
   - Secondary CTA: “Ver cómo funciona”

2. **How it works**
   - Step 1: Registra tu tienda.
   - Step 2: Sube productos y precios.
   - Step 3: Recibe pedidos.
   - Step 4: Entrega y cobra.

3. **Platform modules**
   - Landing/storefront.
   - Admin dashboard.
   - Delivery/order experience.
   - Promotions and push notifications.

4. **For businesses**
   - Designed for liquor stores, depósitos, vinaterías, mini supers, and beverage delivery businesses.

5. **CTA section**
   - “Empieza a vender hoy con Bien Helodias.”
   - CTA: “Solicitar alta”

---

## 3. Visual Mix Decision

### Keep from `DESIGN.md`

Use these concepts as the structural base:

- Modular bento cards.
- Rounded cards and pill buttons.
- Big confident headlines.
- High-contrast CTA treatment.
- Playful, memorable section layouts.
- Icon/card grid storytelling.
- Strong visual rhythm between sections.
- 99px pill radius for buttons/tags.
- 32px / 64px radius for cards.
- 1000px organic blob radius for decorative shapes.

### Replace or adapt from `DESIGN.md`

The original Bento design uses a warm light canvas and thick pure black borders. For Bien Helodias:

- Replace the light linen background with deep charcoal.
- Replace heavy black outlines with tonal dark surfaces, ghost borders, and lime glows.
- Use Lime Punch as the main CTA, but closer to the current palette.
- Use color bands more selectively; avoid making the page look childish.
- Keep the playful energy, but make it feel premium, nocturnal, and alcohol-delivery oriented.

### Keep from `current_DESIGN.md`

Use these as the primary brand identity:

- Deep Charcoal background: `#0E0E0E`
- Lime Punch primary: `#D2FD6E`
- Organic Brutalism.
- Fluid green wave shapes.
- Glassmorphism.
- Premium editorial SaaS tone.
- No rigid 1px dividers.
- No generic grey SaaS cards.
- Space Grotesk for display/headlines.
- Manrope for body/UI.
- Ambient lime glow instead of traditional shadows.

---

## 4. Unified Design Principles

### 4.1 Dark First

The page is primarily dark. Deep charcoal gives the brand a premium nighttime feel connected to drinks, delivery, and party culture.

Use light surfaces only as intentional contrast moments, not as the default page background.

### 4.2 Lime is the Conversion Signal

Lime Punch should be used sparingly and strategically:

- Main CTA buttons.
- Important badges.
- Active states.
- Key highlights.
- Organic wave shapes.
- Tracking/status moments.

Do not use lime as general decoration everywhere. It should feel like a laser pointer guiding the user.

### 4.3 Bento Structure, Liquid Execution

Cards can be arranged in bento grids, but they should not feel like rigid spreadsheet blocks.

Use:

- Asymmetric card sizes.
- Organic shapes behind cards.
- Slight floating overlaps.
- Product imagery breaking out of containers.
- Glass panels for dashboard previews.
- Soft lime ambient glow on important UI mockups.

### 4.4 Premium, Not Corporate

Avoid:

- Generic SaaS blues.
- Flat grey dividers.
- Stock corporate illustrations.
- Overly clean white dashboards.
- Excessive icons.

Prefer:

- Dark product mockups.
- Realistic beverage/store context.
- Bold headlines.
- Editorial copy.
- Neon nightlife energy.
- High-contrast cards.

---

## 5. Color Tokens

```css
:root {
  /* Core Brand */
  --color-primary-lime: #D2FD6E;
  --color-primary-lime-deep: #87AD26;
  --color-primary-lime-dark-text: #486100;

  /* Dark Foundation */
  --color-deep-charcoal: #0E0E0E;
  --color-surface-low: #131313;
  --color-surface-high: #1F2020;
  --color-surface-highest: #262626;

  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #C9C9C9;
  --color-text-muted: #8C8C8C;
  --color-text-dark: #0E0E0E;

  /* Ghost Borders */
  --color-outline-ghost: rgba(255, 255, 255, 0.15);
  --color-outline-strong: rgba(210, 253, 110, 0.45);

  /* Glass */
  --color-glass-surface: rgba(31, 32, 32, 0.60);
  --color-glass-surface-strong: rgba(38, 38, 38, 0.72);

  /* Accent / Decorative */
  --color-maroon-night: #780016;
  --color-cobalt-electric: #2665D6;
  --color-lavender-smoke: #E9C0E9;
  --color-mustard-amber: #D6A337;
  --color-forest-liquor: #254F1A;
  --color-white-card: #FFFFFF;

  /* Status */
  --color-status-transit: #E7E959;
  --color-status-delivered: #D2FD6E;
  --color-status-warning: #D6A337;
  --color-status-danger: #FF5A5F;
}
```

### Color Roles

| Role | Token | Use |
|---|---|---|
| Page background | `--color-deep-charcoal` | Main canvas |
| Section background | `--color-surface-low` | Alternating dark sections |
| Card surface | `--color-surface-high` | Feature cards, pricing cards, admin previews |
| Elevated surface | `--color-surface-highest` | Hover cards, modals, active panels |
| Main CTA | `--color-primary-lime` | Register, start, submit |
| CTA gradient end | `--color-primary-lime-deep` | Button gradient depth |
| Main text | `--color-text-primary` | Headlines and important copy |
| Secondary copy | `--color-text-secondary` | Paragraphs |
| Muted labels | `--color-text-muted` | Small helper text |
| Decorative alcohol/night accent | `--color-maroon-night` | Section accent, beverage cards |
| Decorative tech accent | `--color-cobalt-electric` | Tracking, dashboard details |
| Decorative warmth | `--color-mustard-amber` | Promotions, beer/liquor category cards |

---

## 6. Typography Tokens

Use the current system as the source of truth:

- **Display / Headlines:** Space Grotesk
- **Body / UI:** Manrope

```css
:root {
  --font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Manrope", ui-sans-serif, system-ui, sans-serif;

  --text-caption: 0.75rem;
  --text-body-sm: 0.875rem;
  --text-body: 1rem;
  --text-body-lg: 1.125rem;
  --text-title: 1.5rem;
  --text-heading-sm: 2rem;
  --text-heading: 3.5rem;
  --text-display: clamp(3.5rem, 8vw, 6rem);

  --leading-tight: 0.95;
  --leading-heading: 1.05;
  --leading-body: 1.6;

  --tracking-display: -0.04em;
  --tracking-heading: -0.035em;
  --tracking-label: 0.05em;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
}
```

### Usage

| Role | Font | Size | Weight | Tracking |
|---|---|---:|---:|---:|
| Hero display | Space Grotesk | `clamp(3.5rem, 8vw, 6rem)` | 800 | `-0.04em` |
| Section heading | Space Grotesk | `3.5rem` | 700/800 | `-0.035em` |
| Card title | Space Grotesk | `1.5rem` | 700 | `-0.02em` |
| Body | Manrope | `1rem` | 400/500 | normal |
| Body large | Manrope | `1.125rem` | 400 | normal |
| Technical label | Manrope | `0.75rem` | 700 | `+0.05em`, uppercase |
| Button | Manrope | `1rem` | 800 | normal |

---

## 7. Spacing, Radius & Layout Tokens

```css
:root {
  /* Spacing */
  --space-4: 0.25rem;
  --space-8: 0.5rem;
  --space-12: 0.75rem;
  --space-16: 1rem;
  --space-20: 1.25rem;
  --space-24: 1.5rem;
  --space-32: 2rem;
  --space-40: 2.5rem;
  --space-48: 3rem;
  --space-64: 4rem;
  --space-80: 5rem;
  --space-128: 8rem;

  /* Radius */
  --radius-input: 0.75rem;
  --radius-card-md: 1.5rem;
  --radius-card-lg: 2rem;
  --radius-card-xl: 4rem;
  --radius-pill: 999px;
  --radius-organic: 1000px;

  /* Layout */
  --page-max-width: 1200px;
  --section-padding-y: clamp(4rem, 8vw, 8rem);
  --section-padding-x: clamp(1.25rem, 4vw, 3rem);
}
```

### Layout Rules

- Max content width: `1200px`.
- Use full-bleed sections with internal centered containers.
- Use 12-column grid on desktop.
- Use asymmetric bento grids for feature areas.
- Hero should be a 50/50 split on desktop:
  - Left: headline and CTA.
  - Right: product/storefront/admin visual.
- Mobile stacks content vertically with CTA visible early.

---

## 8. Elevation & Depth

Bien Helodias should not use classic shadows as the main elevation system.

### Use

```css
--glow-lime-soft: 0 0 60px rgba(210, 253, 110, 0.06);
--glow-lime-medium: 0 0 80px rgba(210, 253, 110, 0.12);
--shadow-card-tonal: 0 24px 80px rgba(0, 0, 0, 0.28);
```

### Rules

- Prefer tonal surface changes over borders.
- Use lime ambient glow only for hero mockups, active tracking cards, and primary conversion areas.
- Avoid harsh black drop shadows.
- Avoid 1px grey dividers.
- Use ghost borders only when an edge needs clarity:
  - `1px solid rgba(255,255,255,0.15)`
  - On focus/active: `1px solid rgba(210,253,110,0.45)`

---

## 9. Component System

## 9.1 Primary Button

**Role:** Main conversion action — register store, start selling, submit form.

```css
.bh-btn-primary {
  border: none;
  border-radius: var(--radius-pill);
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary-lime), var(--color-primary-lime-deep));
  color: var(--color-primary-lime-dark-text);
  font-family: var(--font-body);
  font-weight: 800;
  box-shadow: 0 0 0 rgba(210, 253, 110, 0);
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
}

.bh-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 42px rgba(210, 253, 110, 0.18);
  filter: brightness(1.04);
}
```

### Content examples

- “Dar de alta mi negocio”
- “Empezar a vender”
- “Solicitar acceso”
- “Crear tienda”

---

## 9.2 Secondary Button

**Role:** Secondary action — see demo, learn how it works, view plans.

```css
.bh-btn-secondary {
  border: 1px solid var(--color-outline-ghost);
  border-radius: var(--radius-pill);
  padding: 1rem 1.5rem;
  background: transparent;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-weight: 700;
  backdrop-filter: blur(16px);
}

.bh-btn-secondary:hover {
  border-color: var(--color-outline-strong);
  background: rgba(210, 253, 110, 0.06);
}
```

---

## 9.3 Glass Navigation

**Role:** Floating top navigation for the brand page.

```css
.bh-nav {
  position: sticky;
  top: 1rem;
  z-index: 50;
  max-width: 1120px;
  margin: 1rem auto 0;
  padding: 0.625rem 0.75rem 0.625rem 1rem;
  border-radius: var(--radius-pill);
  background: rgba(31, 32, 32, 0.60);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(32px);
}
```

### Nav links

- Inicio
- Cómo funciona
- Para negocios
- Plataforma
- Alta de negocio

---

## 9.4 Bento Feature Card

**Role:** Explain product modules or benefits.

```css
.bh-bento-card {
  border-radius: var(--radius-card-lg);
  background: var(--color-surface-high);
  border: 1px solid var(--color-outline-ghost);
  padding: clamp(1.25rem, 2vw, 2rem);
  position: relative;
  overflow: hidden;
}

.bh-bento-card.is-highlight {
  background:
    radial-gradient(circle at top right, rgba(210, 253, 110, 0.18), transparent 38%),
    var(--color-surface-high);
  border-color: rgba(210, 253, 110, 0.24);
}
```

### Card examples

1. **Tienda online**
   - Publica tu catálogo y recibe pedidos desde una página rápida y moderna.

2. **Panel administrativo**
   - Gestiona productos, banners, precios, disponibilidad y pedidos.

3. **Experiencia de entrega**
   - Flujo pensado para pedidos rápidos, seguimiento y notificaciones.

4. **Promociones**
   - Activa ofertas, productos destacados y campañas por temporada.

---

## 9.5 Organic Lime Wave

**Role:** Main brand separator and visual identity element.

```css
.bh-lime-wave {
  position: absolute;
  inset: auto -10% -18% -10%;
  height: 38%;
  border-radius: 1000px 1000px 0 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(255,255,255,0.28), transparent 18%),
    linear-gradient(135deg, var(--color-primary-lime), var(--color-primary-lime-deep));
  filter: drop-shadow(0 0 64px rgba(210, 253, 110, 0.12));
}
```

### Usage

- Behind hero mockup.
- Between “How it works” and “Platform modules.”
- As background accent in the final CTA.
- Never use as a simple straight divider.

---

## 9.6 Product / Admin Mockup Card

**Role:** Show the existing ecosystem: landing, admin, delivery.

```css
.bh-product-mockup {
  border-radius: var(--radius-card-xl);
  background: var(--color-glass-surface);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(32px);
  box-shadow: var(--glow-lime-soft), var(--shadow-card-tonal);
  overflow: hidden;
}
```

### Recommended mockup content

- Storefront card with product list.
- Admin dashboard screenshot-style layout.
- Delivery order status.
- CTA chip: “Pedido recibido”
- Tracking chip: “En camino”
- Sales chip: “Nueva venta”

---

## 9.7 Step Card

**Role:** Explain store onboarding.

```css
.bh-step-card {
  border-radius: var(--radius-card-md);
  background: var(--color-surface-low);
  border: 1px solid var(--color-outline-ghost);
  padding: 1.5rem;
}

.bh-step-number {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-pill);
  display: grid;
  place-items: center;
  background: var(--color-primary-lime);
  color: var(--color-primary-lime-dark-text);
  font-weight: 900;
}
```

### Step copy

1. **Registra tu negocio**
   - Comparte los datos básicos de tu tienda y zona de cobertura.

2. **Configura tu catálogo**
   - Agrega bebidas, precios, fotos, categorías y disponibilidad.

3. **Recibe pedidos**
   - Tus clientes compran desde tu página y tú los gestionas desde el panel.

4. **Entrega y crece**
   - Administra pedidos, promociones y comunicación con clientes.

---

## 9.8 Form Inputs

**Role:** Store registration / lead capture.

```css
.bh-input {
  width: 100%;
  border: 1px solid var(--color-outline-ghost);
  border-radius: var(--radius-input);
  background: var(--color-surface-high);
  color: var(--color-text-primary);
  padding: 0.95rem 1rem;
  font-family: var(--font-body);
}

.bh-input:focus {
  outline: none;
  border-color: var(--color-primary-lime);
  box-shadow: 0 0 0 4px rgba(210, 253, 110, 0.08);
}
```

### Suggested fields

- Nombre del negocio.
- Nombre de contacto.
- WhatsApp.
- Ciudad / zona.
- Tipo de negocio.
- Número aproximado de productos.
- ¿Ya haces entregas?

---

## 10. Page Sections

## 10.1 Hero Section

### Intent

Immediately explain the value of Bien Helodias and drive business registration.

### Visual

- Deep charcoal full-bleed background.
- Large Space Grotesk headline.
- Lime gradient organic wave behind product/admin mockup.
- Floating glass nav.
- Primary CTA + secondary CTA.
- Optional badge: “Para vinaterías, depósitos y negocios de bebidas.”

### Copy direction

**Headline:**

> Tu tienda de bebidas, lista para vender en línea.

**Subcopy:**

> Bien Helodias te ayuda a publicar tu catálogo, recibir pedidos y administrar entregas desde una plataforma moderna para negocios de bebidas.

**CTA:**

- Dar de alta mi negocio
- Ver cómo funciona

---

## 10.2 How It Works Section

### Intent

Make the registration flow feel simple.

### Layout

- Four step cards in a bento grid.
- Lime number pills.
- Dark surfaces.
- No dividers.

### Section heading

> Empieza a vender en 4 pasos.

---

## 10.3 Platform Modules Section

### Intent

Show that Bien Helodias is not just a landing page. It is a complete ecosystem.

### Bento cards

1. **Landing / storefront**
2. **Admin**
3. **Delivery**
4. **Promotions**
5. **Push notifications**
6. **Order management**

### Visual treatment

- Main large card for “Panel administrativo”.
- Smaller cards around it.
- Lime glow on active dashboard card.
- Maroon and amber accents for beverage context.

---

## 10.4 For Businesses Section

### Intent

Make target users identify themselves.

### Suggested cards

- Vinaterías.
- Depósitos.
- Licorerías.
- Mini supers.
- Tiendas con entrega local.
- Negocios de bebidas preparados.

### Copy

> Si vendes bebidas y quieres recibir pedidos sin depender solo de WhatsApp, Bien Helodias te da una tienda digital con flujo de venta, administración y entrega.

---

## 10.5 Registration CTA Section

### Intent

Final conversion.

### Visual

- Full dark section.
- Large organic lime wave.
- Glass form card.
- Big headline.
- Minimal fields.
- Strong CTA.

### Headline

> Da de alta tu negocio y empieza a vender con Bien Helodias.

### CTA

> Solicitar alta

---

## 11. Imagery & Iconography

### Use

- Product mockups of the current landing, admin, and delivery apps.
- Dark UI screenshots.
- Alcohol category imagery: beer, whiskey, tequila, wine, cocktails.
- High-quality editorial product photography.
- Floating bottles/cans only if they feel premium.
- Monoline icons only as support.

### Avoid

- Corporate people illustrations.
- Generic delivery scooter cartoons.
- Excessive clipart.
- Overly bright childish backgrounds.
- Icons replacing real product visuals.

---

## 12. Motion & Interaction

### Recommended Motion

- CTA hover: slight lift + lime glow.
- Cards: subtle lift or background tonal shift.
- Organic wave: slow ambient movement.
- Mockup: slow floating transform.
- Step cards: staggered entrance.
- Form focus: lime ring.

### Avoid

- Bouncy cartoon motion.
- Heavy parallax that affects performance.
- Spinning bottles or distracting effects.
- Excessive animation on admin/product UI.

---

## 13. Do’s and Don’ts

### Do

- Use `DESIGN.md` as layout inspiration: bento cards, big headings, rounded shapes, strong CTA rhythm.
- Use `current_DESIGN.md` as the visual source of truth: dark charcoal, lime punch, glassmorphism, organic brutalism.
- Use Lime Punch only for conversion and important status.
- Use Space Grotesk for confident editorial headlines.
- Use Manrope for readable SaaS/product copy.
- Use dark tonal surfaces instead of hard dividers.
- Use organic green waves to separate sections.
- Show the real product ecosystem: landing, admin, delivery.
- Make the onboarding process feel simple and fast.

### Don’t

- Don’t use the original light Bento canvas as the main background.
- Don’t use thick black borders everywhere.
- Don’t turn every card lime.
- Don’t use generic SaaS blue as the primary color.
- Don’t use pure black `#000000` as the page background.
- Don’t rely on 1px grey divider lines.
- Don’t make the page feel like a spreadsheet or admin manual.
- Don’t overload the layout with icons.
- Don’t hide the business registration CTA.

---

## 14. Tailwind v4 Theme

```css
@theme {
  /* Fonts */
  --font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Manrope", ui-sans-serif, system-ui, sans-serif;

  /* Colors */
  --color-primary-lime: #D2FD6E;
  --color-primary-lime-deep: #87AD26;
  --color-primary-lime-dark-text: #486100;

  --color-deep-charcoal: #0E0E0E;
  --color-surface-low: #131313;
  --color-surface-high: #1F2020;
  --color-surface-highest: #262626;

  --color-text-primary: #FFFFFF;
  --color-text-secondary: #C9C9C9;
  --color-text-muted: #8C8C8C;
  --color-text-dark: #0E0E0E;

  --color-maroon-night: #780016;
  --color-cobalt-electric: #2665D6;
  --color-lavender-smoke: #E9C0E9;
  --color-mustard-amber: #D6A337;
  --color-forest-liquor: #254F1A;

  /* Type */
  --text-caption: 0.75rem;
  --text-body-sm: 0.875rem;
  --text-body: 1rem;
  --text-body-lg: 1.125rem;
  --text-title: 1.5rem;
  --text-heading-sm: 2rem;
  --text-heading: 3.5rem;
  --text-display: clamp(3.5rem, 8vw, 6rem);

  /* Radius */
  --radius-input: 0.75rem;
  --radius-card-md: 1.5rem;
  --radius-card-lg: 2rem;
  --radius-card-xl: 4rem;
  --radius-pill: 999px;
  --radius-organic: 1000px;
}
```

---

## 15. Recommended Component Prompt

Use this prompt when generating the brand page UI:

> Create a dark premium SaaS landing page for Bien Helodias, a liquor store delivery and online ordering platform. Use a deep charcoal background (#0E0E0E), Lime Punch (#D2FD6E) as the primary CTA accent, Space Grotesk for large editorial headlines, and Manrope for body text. The layout should mix bento-style rounded cards with organic lime wave shapes and glassmorphism. The page must explain how stores can register, upload products, receive orders, and manage deliveries. Use asymmetric dark cards, subtle ghost borders, ambient lime glow, and product mockups for landing, admin, and delivery experiences. Avoid generic SaaS templates, flat grey dividers, childish colors, and heavy black outlines.

---

## 16. Implementation Notes for Bien Helodias

### Most important design decision

The new brand page should **not become a copy of the Bento reference**. It should use Bento as a structural reference only.

The actual visual identity must remain:

- dark,
- premium,
- lime-accented,
- alcohol/nightlife aligned,
- fluid,
- modern,
- product-focused.

### Final direction

**Bien Helodias = Dark premium liquor SaaS + playful bento storytelling + organic lime energy.**
