# Design System: "The Velvet Editorial"

> Sistema de design editorial de alto padrão inspirado em publicações de luxo, criado para o ecossistema DQFB Business.

## Filosofia

O "Velvet Editorial" se afasta da estética clínica e baseada em grids dos SaaS tradicionais. É enraizado no mundo das publicações de alto padrão e identidade de marcas de luxo. Cada tela é tratada como uma **canvas curada**, utilizando layering tonal profundo e tipografia expressiva para estabelecer uma presença digital "Chic and Powerful".

Para escapar do "look de template", empregamos **assimetria intencional**. Layouts devem evitar blocos perfeitamente centralizados; ao invés disso, usar margens amplas e elementos sobrepostos para criar uma sensação de movimento e craftsmanship.

---

## Paleta de Cores

A paleta combina jewel tones de alto contraste com neutros suaves de tons de pele.

### Primary (Velvet)
| Token | Hex | Uso |
|-------|-----|-----|
| `primary` | `#680114` | Autoridade, paixão, profundidade — CTAs principais |
| `primary-container` | `#881d28` | Hover de CTAs, brand mark |
| `on-primary` | `#ffffff` | Texto sobre primary |
| `on-primary-container` | `#ff999a` | Texto sobre primary-container |

### Secondary (Precious)
| Token | Hex | Uso |
|-------|-----|-----|
| `secondary` | `#34675f` | Profissionalismo, luxo |
| `secondary-container` | `#b5eae0` | Chips, badges |
| `on-secondary` | `#ffffff` | Texto sobre secondary |
| `on-secondary-container` | `#396b63` | Texto sobre secondary-container |

### Tertiary (Pinky)
| Token | Hex | Uso |
|-------|-----|-----|
| `tertiary` | `#63003b` | Modernidade, vibrância |
| `tertiary-container` | `#8c0055` | Acentos vibrantes |
| `on-tertiary` | `#ffffff` | Texto sobre tertiary |
| `on-tertiary-container` | `#ff94c1` | Texto sobre tertiary-container |

### Neutrals (Cream & Off-white)
| Token | Hex | Uso |
|-------|-----|-----|
| `surface` | `#fcf8f7` | Fundo principal |
| `surface-container-lowest` | `#ffffff` | Cards elevados |
| `surface-container-low` | `#f7f3f2` | Footer, áreas secundárias |
| `surface-container` | `#f1edec` | Containers padrão |
| `surface-container-high` | `#ebe7e6` | Containers destacados |
| `surface-container-highest` | `#e5e2e1` | Containers proeminentes |
| `surface-variant` | `#e5e2e1` | Variações de superfície |
| `on-surface` | `#1c1b1b` | Texto principal |
| `on-surface-variant` | `#574141` | Texto secundário |

### Outline
| Token | Hex | Uso |
|-------|-----|-----|
| `outline` | `#8b7170` | Bordas (raras) |
| `outline-variant` | `#debfbe` | "Ghost borders" sutis |

### Cores de Marca (não-tokenizadas)
Algumas cores específicas são usadas via arbitrary values:

| Hex | Onde |
|-----|------|
| `#881D28` | Logo, links ativos no header |
| `#F8F4F3` | Header e Footer background |
| `#EDD4D7` | Divisores |
| `#CE3B87` | Acentos vibrantes (dark mode) |
| `#0C453E` | Card de Curadoria |

---

## Tipografia

Pareamento de alto contraste que balanceia a atemporalidade do serif com a utilidade moderna do geometric sans.

### Display & Headlines — Fraunces
- **Variável CSS:** `--font-fraunces`
- **Tailwind:** `font-display`
- **Uso:** Hero titles, blockquotes, "Editorial Moments"
- **Exemplo:** Hero "Controle DQFB" em `text-7xl font-bold`
- **Característica:** Misturar regular + italic na mesma headline para "look high-fashion"

### Body & Titles — Manrope
- **Variável CSS:** `--font-manrope`
- **Tailwind:** `font-body` (default)
- **Uso:** Parágrafos, descriptions, body text
- **Line height:** 1.6 (`leading-relaxed`)

### Brand — Noto Serif
- **Variável CSS:** `--font-noto-serif`
- **Tailwind:** `font-serif`
- **Uso:** Logo "DQFB Business" no Header e Footer
- **Sempre:** `uppercase tracking-widest`

### Labels (UPPERCASE)
- Use Manrope (font-body) com `uppercase`
- `text-[10px]` ou `text-xs`
- `tracking-widest` ou `tracking-[0.3em]`
- Cor: `text-primary` ou variação contextual

---

## Elevação & Profundidade

### Tonal Layering (recomendado)
Profundidade criada empilhando tokens de superfície. Um card `surface-container-lowest` colocado sobre um background `surface-container-low` cria um lift natural e suave — sem sombras pretas.

### Shadows (use com moderação)
Para elementos que realmente "flutuam" (modais, cards de hover):
- **Cor:** Versão tinted de `on-surface` a 4-8% opacity
- **Blur:** 30-60px
- **Y-offset:** 10-20px
- **Tailwind:** `shadow-xl` (nos cards de módulo)

### "Ghost Border" (fallback de acessibilidade)
Se uma borda for necessária, use `outline-variant` a 15-30% opacity para criar uma "sugestão" de linha:
```html
<div class="border-l border-outline-variant/30">
```

---

## Border Radius

| Token | Valor | Tailwind | Uso |
|-------|-------|----------|-----|
| `DEFAULT` | `0.125rem` | `rounded` | Cards, buttons (padrão) |
| `lg` | `0.25rem` | `rounded-lg` | Inputs maiores |
| `xl` | `0.5rem` | `rounded-xl` | Modais |
| `full` | `0.75rem` | `rounded-full` | Chips (raro) |

> **Regra:** Cantos afiados são padrão. Não usar `rounded-lg` ou maior em containers principais.

---

## Componentes

### Buttons

**Primary:**
- Background: `bg-primary` (`#680114`)
- Text: `text-on-primary` (white)
- Shape: `rounded-sm` ou default
- Hover: transition para `primary-container` (`#881d28`)
- Style: uppercase, tracking-widest, font-bold

```jsx
<button className="bg-primary text-white px-8 py-4 font-body text-xs uppercase tracking-widest font-bold hover:bg-primary-container transition-colors">
  Acessar
</button>
```

**Secondary (Ghost):**
- Sem background
- Texto `text-primary` com underline no hover
- Mesma tipografia do primary

### Module Cards

Cards verticais de 480px com:
- Padding 32px (`p-8`)
- Background sólido (cor própria do módulo)
- Ícone Material Symbols 9xl no canto superior direito (opacity 20% → 40% no hover)
- Label uppercase 10px com fundo `bg-white/10`
- Título Fraunces 3xl-4xl com mistura regular + italic
- Descrição Manrope 14px texto branco/80
- Botão branco full-width com seta

```jsx
<div className="group relative bg-primary p-8 h-[480px] flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-2">
```

### Cards & Lists

- **Forbid:** Linhas divisórias entre items de lista
- **Use:** `gap-6` ou shifts entre `surface-container` tiers
- **Imagens:** Aspect ratio 1:1 ou 4:5 (estética magazine)

### Input Fields (futuro)

- Estilo minimalista
- Apenas border-bottom usando `outline-variant` a 20% opacity
- No focus: border transitions para `primary` e label flutua para cima
- Label All-Caps DM Sans

### Chips (futuro)

- Selection: `bg-secondary-container` com `text-on-secondary-container`
- Shape: `rounded-full` (contraste com cantos afiados de buttons)

---

## Do's and Don'ts

### ✅ Do

- **Misturar weights e estilos** (Italics + Regular) em headlines para criar ritmo visual
- **Usar white space assimétrico** — deixar um lado do layout "mais pesado"
- **Priorizar Cream e Off-white** para que Velvet e Precious sejam recompensas visuais
- **Cantos afiados** (`rounded` default 0.125rem)
- **Tonal layering** ao invés de borders e sombras pretas

### ❌ Don't

- **Não usar borders 1px solid black** ou alto contraste
- **Não usar drop-shadows cinza/preto** — sempre tintar com cor de superfície
- **Não overcrowdar** — se uma seção parece "busy", aumentar white space em 20%
- **Não usar `rounded-lg`** ou maior em containers principais — manter sharp
- **Não centralizar perfeitamente** layouts — buscar assimetria
- **Não criar dividers** entre items de lista — usar spacing

---

## Implementação Técnica

### Tailwind v4 (`@theme` directive)

Todos os tokens vivem em `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #680114;
  --color-primary-container: #881d28;
  /* ... */
  --font-display: var(--font-fraunces), serif;
  --font-body: var(--font-manrope), sans-serif;
}
```

> **Importante:** Não há `tailwind.config.ts`. Tailwind v4 usa CSS-first config.

### Fontes via next/font

```typescript
// src/lib/fonts.ts
import { Fraunces, Manrope, Noto_Serif } from 'next/font/google';

export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});
```

Aplicadas no `<html>` do `layout.tsx`:
```tsx
<html className={`${fraunces.variable} ${manrope.variable} ${notoSerif.variable}`}>
```

### Dark Mode

Class-based via Zustand store (`src/stores/theme.ts`):
```typescript
document.documentElement.classList.toggle('dark', isDark);
```

Cards mantêm cores próprias em dark mode (são sempre escuros). Header, Footer e textos invertem.

---

## Recursos Visuais

- **Protótipo HTML:** `telas/code.html` — referência visual completa
- **Screenshot:** `telas/screen.png` — desktop view final
- **Design Doc:** `telas/DESIGN.md` — manifesto original do design system

---

## Referência Rápida

| Elemento | Token/Class |
|----------|-------------|
| Hero título | `font-display text-7xl font-bold text-primary editorial-title` |
| Body padrão | `font-body text-xl text-on-surface-variant leading-relaxed` |
| Label uppercase | `font-body text-[10px] uppercase tracking-widest text-primary` |
| Brand logo | `font-serif font-bold text-[#881D28] uppercase tracking-widest` |
| CTA primary | `bg-primary text-white px-8 py-4 uppercase tracking-widest font-bold` |
| Card module | `p-8 h-[480px] shadow-2xl hover:-translate-y-2 transition-all duration-500` |
| Divisor | `bg-[#EDD4D7] dark:bg-stone-900 h-px w-full` |
