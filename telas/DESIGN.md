# Design System Document: High-End Editorial Strategy

## 1. Overview & Creative North Star
**Creative North Star: "The Velvet Editorial"**

This design system is a departure from the clinical, grid-locked structures of traditional SaaS. It is rooted in the world of high-end publishing and luxury brand identity. The "Velvet Editorial" approach treats every screen as a curated canvas, utilizing deep, tonal layering and expressive typography to establish a "Chic and Powerful" digital presence.

To move beyond the "template" look, we employ **intentional asymmetry**. Layouts should avoid perfectly centered blocks; instead, use wide margins and overlapping elements (e.g., a text block partially bleeding over a background image or a high-surface card) to create a sense of motion and bespoke craftsmanship.

---

## 2. Colors
Our palette is a sophisticated blend of high-contrast jewel tones and soft, skin-tone neutrals.

### The Palette
- **Primary (Velvet):** `#881D28` – Authority, passion, and depth.
- **Secondary (Precious):** `#0C453E` – Professionalism and luxury.
- **Tertiary (Pinky):** `#CE3B87` – Modernity and vibrant accents.
- **Neutrals (Cream & Off-white):** `#EDD4D7` & `#F8F4F3` – The foundation of our "breathable" space.

### Implementation Rules
*   **The "No-Line" Rule:** We do not use 1px solid borders to section content. Boundaries must be defined through background color shifts. For example, a `surface-container-low` (`#f7f3f2`) footer should sit against a `surface` (`#fcf8f7`) main body. 
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of fine paper. Use `surface-container-lowest` to `highest` to create logical groupings. An inner card should be slightly lighter or darker than its parent container to define depth, never outlined.
*   **The Glass & Gradient Rule:** For floating navigation or action menus, use Glassmorphism. Apply a background blur (16px+) to a semi-transparent `surface` color.
*   **Signature Textures:** Main CTAs or Hero backgrounds should use a subtle linear gradient from `primary` (`#680114`) to `primary-container` (`#881d28`) at a 135-degree angle to add a "silken" finish.

---

## 3. Typography
We use a high-contrast pairing that balances the timelessness of a serif with the modern utility of a geometric sans.

*   **Display & Headlines (Playfair Display):** These are our "Editorial Moments." Use `display-lg` (3.5rem) for hero statements. Be bold with mix-casing; as seen in the brand attributes, mixing regular and *italic* weights within the same headline creates a signature, high-fashion look.
*   **Body & Titles (DM Sans):** Our workhorse. DM Sans provides a clean, professional contrast to the ornate headers. Ensure `body-lg` (1rem) has a generous line-height (1.6) to maintain readability and luxury.
*   **Labels (DM Sans):** Use All-Caps for labels and small details to instill an "authoritative" feel, mirroring the brand reference for "DETALHES MENORES."

---

## 4. Elevation & Depth
Elevation is achieved through light and shadow, not lines.

*   **Tonal Layering:** Depth is created by stacking surface tokens. A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural, soft lift.
*   **Ambient Shadows:** For elements that truly "float" (like a primary modal), use an ultra-diffused shadow.
    *   *Shadow Color:* A tinted version of `on-surface` (4-8% opacity).
    *   *Blur:* 30px–60px.
    *   *Y-Offset:* 10px–20px.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline-variant` token at **15% opacity**. This creates a "suggestion" of a line rather than a hard boundary.

---

## 5. Components

### Buttons
*   **Primary:** Background: `primary` (#680114). Text: `on-primary`. Shape: `rounded-sm` (0.125rem) for a sharp, tailored look.
*   **Secondary:** Ghost style. No background. `primary` text with an underline that appears on hover.
*   **Interaction:** On hover, primary buttons should transition to `primary-container` (#881d28).

### Cards & Lists
*   **The Rule of Space:** Forbid the use of divider lines. Separate list items using the `spacing-scale` (e.g., 24px vertical gap) or subtle shifts between `surface-container` tiers. 
*   **Images:** All imagery within cards should have a 1:1 or 4:5 aspect ratio to maintain the editorial "magazine" feel.

### Input Fields
*   **Style:** Minimalist. Only a bottom border using `outline-variant` at 20% opacity. 
*   **States:** On focus, the bottom border transitions to `primary` (#680114) and the label (DM Sans All-Caps) floats upward.

### Chips
*   **Selection:** Use `secondary-container` (#b5eae0) with `on-secondary-container` text. Use `rounded-full` for chips to contrast against the sharp corners of buttons and cards.

---

## 6. Do's and Don'ts

### Do
*   **Do** mix weights and styles (Italics + Regular) in headlines to create visual rhythm.
*   **Do** use asymmetrical white space. Leave one side of a layout "heavier" than the other to feel intentional.
*   **Do** prioritize the Cream and Off-white neutrals to let the Velvet and Precious accents feel like a reward.

### Don't
*   **Don't** use 1px solid black or high-contrast borders. It breaks the editorial "flow."
*   **Don't** use standard "drop shadows" with grey or black. Always tint shadows with the surface color.
*   **Don't** overcrowd the screen. If a section feels busy, increase the white space by 20%.
*   **Don't** use rounded corners larger than `xl` (0.75rem) for primary containers; stay sharp (`sm`) to maintain professional "strength."