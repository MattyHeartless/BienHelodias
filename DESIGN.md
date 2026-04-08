# Design System Strategy: High-End Editorial SaaS

## 1. Overview & Creative North Star
The visual identity of this design system is anchored by the **"Liquid Velocity"** North Star. This concept bridges the sophisticated, high-end world of premium spirits with the high-tech, kinetic energy of autonomous delivery. 

To move beyond the "SaaS template" look, this system rejects rigid, boxy layouts in favor of **Organic Brutalism**. We utilize fluid, wavy green shapes that cut through deep charcoal surfaces, creating intentional asymmetry. Elements should feel like they are floating in a dark, atmospheric space, guided by the "glow" of neon highlights rather than the constraints of traditional grid lines.

---

## 2. Colors
Our palette is built on high-contrast tension between the obsidian-like depths of the charcoal and the radioactive energy of the lime punch.

### Core Palette
*   **Primary (Lime Punch):** `#D2FD6E` – Used exclusively for moments of conversion and high-priority action.
*   **Background (Deep Charcoal):** `#0E0E0E` – The canvas. Provides the "infinite" depth required for a premium feel.
*   **Surface Hierarchy (The Graphite Tiers):** 
    *   `surface-container-low`: `#131313` (Base sections)
    *   `surface-container-high`: `#1F2020` (Standard cards)
    *   `surface-container-highest`: `#262626` (Hover states/Elevated modals)

### The "No-Line" Rule
Designers are strictly prohibited from using 1px solid borders to define sections. Layout boundaries must be established through:
1.  **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
2.  **Fluid Masking:** Using the organic green wave shapes to "cut" the screen and separate content sections.
3.  **Tonal Depth:** Placing a `surface-container-highest` element directly onto the `surface` background.

### The Glass & Gradient Rule
For high-interaction components like navigation bars or autonomous tracking overlays, use **Glassmorphism**. Apply `surface-bright` at 60% opacity with a 32px backdrop blur. For primary CTAs, do not use flat color; apply a subtle linear gradient from `primary` (#D2FD6E) to `primary-container` (#87AD26) at a 135-degree angle to add "soul" and dimension.

---

## 3. Typography
The typography strategy employs a "Tech-Editorial" mix, pairing the geometric precision of **Space Grotesk** with the humanist clarity of **Manrope**.

*   **The Authority (Display & Headlines):** **Space Grotesk** is used for all `display` and `headline` levels. In `display-lg` (3.5rem), use a letter-spacing of `-0.04em` to create a tight, high-fashion impact. This conveys the technological sophistication of autonomous delivery.
*   **The Narrative (Title & Body):** **Manrope** handles all functional reading. It is approachable yet modern. 
    *   `body-lg` (1rem) should be used for product descriptions with a generous line height (1.6) to maintain an editorial feel.
    *   `label-md` (0.75rem) in all-caps with `+0.05em` letter-spacing should be used for technical specs (e.g., "ABV 40%", "DRONE ETA: 4 MIN").

---

## 4. Elevation & Depth
In this design system, depth is a matter of light and layering, not structural scaffolding.

*   **The Layering Principle:** Treat the UI as physical layers. A product card (`surface-container-high`) does not sit *on* the background; it floats *above* it. Use the `surface-container` tiers to create this natural lift.
*   **Ambient Shadows:** Traditional drop shadows are forbidden. If an element requires a "floating" effect (like a drone tracking map), use an **Ambient Glow**. This is a shadow with a 60px blur, 0px offset, and 6% opacity, using the `primary` (Lime Punch) color instead of black to simulate the neon light reflecting off the charcoal surface.
*   **The Ghost Border Fallback:** If accessibility requires a border, use the **Ghost Border**: the `outline-variant` token at 15% opacity. This provides a "suggestion" of an edge without breaking the fluid aesthetic.

---

## 5. Components

### Buttons
*   **Primary:** Ultra-rounded (`full`). Gradient fill (`primary` to `primary-container`). Text color: `on-primary` (#486100).
*   **Secondary:** Pill-shaped, Ghost Border style. No fill. 
*   **Interaction:** On hover, primary buttons should exhibit a "Lime Glow" (a subtle outer shadow of the primary color).

### Cards & Product Grids
*   **Styling:** Use `md` (1.5rem) or `lg` (2rem) corner radius. 
*   **Layout:** Strictly no divider lines. Use vertical white space and `surface` shifts. 
*   **Editorial Touch:** Images should occasionally break the container's bounds (asymmetric "pop-out" effect) to create movement.

### Autonomous Tracking Chips
*   **Status:** Use `secondary` (#E7E959) for "In Transit" and `primary` (#D2FD6E) for "Delivered."
*   **Shape:** Wavy, organic fluid shapes rather than standard rectangles to mirror the brand's visual identity.

### Input Fields
*   **Style:** Minimalist. Underline-only or subtle `surface-container-highest` fills. 
*   **Focus State:** The label should animate into a `label-sm` and the "Ghost Border" should transition to 100% opacity Lime Punch.

---

## 6. Do's and Don'ts

### Do
*   **Do** use the organic green wave shapes to mask hero imagery or section transitions.
*   **Do** embrace negative space. High-end products need room to "breathe" to appear premium.
*   **Do** use asymmetrical layouts. Place a large headline on the left and a product floating slightly off-center on the right.
*   **Do** use `primary` sparingly. It is a laser, not a paint brush.

### Don't
*   **Don't** use pure `#000000` for backgrounds. Use the `surface` token (`#0E0E0E`) to allow for subtle shadows.
*   **Don't** use standard 1px grey dividers. They make the UI look like a spreadsheet. Use `surface` tonal shifts.
*   **Don't** use sharp 90-degree corners. Everything in the autonomous/liquor world should feel "liquid" and smooth.
*   **Don't** clutter the screen with icons. Use high-quality editorial photography as the primary visual driver.