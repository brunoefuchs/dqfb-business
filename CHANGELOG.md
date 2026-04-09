# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-04-09

### Initial Release — Epic 1: Portal MVP

Lançamento inicial do portal DQFB Business — hub editorial centralizado para 5 sistemas de negócio.

#### Added

**Story 1.1 — Project Scaffolding (PR #1)**
- Inicialização do projeto Next.js 16+ com App Router e TypeScript
- Configuração do Tailwind CSS v4 com 40+ tokens de cor via `@theme` directive
- Setup de fontes Google (Fraunces, Manrope, Noto Serif) via `next/font`
- Material Symbols Outlined para ícones
- ESLint 9 com flat config + TypeScript parser
- Vitest para testes unitários
- Estrutura de pastas: components/, config/, stores/, types/, lib/
- Variáveis de ambiente para URLs dos 5 módulos

**Story 1.2 — Header & Navigation (PR #2)**
- Header sticky com brand "DQFB Business" em Noto Serif
- Navegação responsiva com 4 links de módulos (estado ativo)
- Área de usuário com dark mode toggle, notifications, settings, avatar
- Divisor sutil abaixo do header

**Story 1.3 — Hero Section (PR #2)**
- Título editorial "Controle DQFB" em Fraunces 7xl
- Layout grid 12 colunas asymmetric
- Subtitle em Manrope com `max-w-2xl`
- Classe utilitária `editorial-title` (letter-spacing -0.02em)

**Story 1.4 — Module Cards Grid (PR #2)**
- 5 cards verticais (Transcrição, Financeiro DQFB, Financeiro Pessoal, Talk DQFB, Curadoria DQFB)
- Cada card 480px com label, título mixed-style, descrição, CTA
- Grid responsivo: 5/2/1 colunas (desktop/tablet/mobile)
- Hover translate-y-2 com transição 500ms
- Ícone background com opacity 20%→40% no hover
- URLs configuráveis via env vars
- Type-safe com `ModuleConfig` interface

**Story 1.5 — Quote Section & Footer (PR #2)**
- Quote section editorial com imagem grayscale-to-color
- Blockquote em Fraunces 4xl italic
- Footer com brand, links (Privacy, Terms, Contact), copyright

**Story 1.6 — Dark Mode & Responsive (PR #2)**
- Zustand store para gerenciamento de dark mode
- DarkModeToggle component integrado no Header
- Class-based dark mode (`document.documentElement.classList.toggle`)
- Responsive breakpoints validados em 3 viewports

**Story 1.7 — Deploy & CI (PR #2)**
- GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Quality gates: lint + typecheck + build
- Triggers em push para `main` e PRs
- Vercel git integration para deploy automático

#### Documentation

- PRD completo (`docs/prd.md`)
- Architecture document (`docs/architecture.md`)
- 7 stories detalhadas em `docs/stories/`
- README.md principal
- SETUP.md, DEPLOYMENT.md, DESIGN-SYSTEM.md

---

## [0.1.1] - 2026-04-09

### Polish & SEO Improvements (PR #4)

#### Added

**SEO & Discovery**
- Metadata completo: title template, description, keywords, authors
- OpenGraph metadata com locale `pt_BR`
- Twitter Cards (summary_large_image)
- Sitemap.xml automático via `app/sitemap.ts`
- Robots.txt automático via `app/robots.ts`
- `metadataBase` configurado
- `themeColor` no viewport

**Visual Identity**
- Favicon dinâmico (32x32) com brand "D" italic serif (`app/icon.tsx`)
- Apple touch icon (180x180) (`app/apple-icon.tsx`)
- OpenGraph image dinâmica (1200x630) com layout editorial (`app/opengraph-image.tsx`)

**Pages**
- 404 page customizada (`app/not-found.tsx`) com design system
- Loading state (`app/loading.tsx`)
- Error boundary com retry (`app/error.tsx`)

**Quote Section Enhancement**
- Substituição do gradient placeholder por imagem real (Unsplash)
- `next/image` com sizing apropriado
- Configuração de remote patterns em `next.config.ts`

**Accessibility**
- Skip-to-main-content link
- `id="main-content"` no `<main>`
- aria-label no DarkModeToggle
- Alt text em imagens

#### Fixed

**CI/CD (PR #3)**
- Sincronização do `package-lock.json` para resolver falha do `npm ci` em CI

---

## Histórico de Pull Requests

| PR | Título | Stories | Merged |
|----|--------|---------|--------|
| #1 | feat: project scaffolding & design system | 1.1 | 2026-04-09 |
| #2 | feat: implement DQFB Business portal | 1.2-1.7 | 2026-04-09 |
| #3 | fix: sync package-lock.json | — | 2026-04-09 |
| #4 | feat: SEO, accessibility & polish | — | 2026-04-09 |

---

[0.1.0]: https://github.com/brunoefuchs/dqfb-business/releases/tag/v0.1.0
[0.1.1]: https://github.com/brunoefuchs/dqfb-business/releases/tag/v0.1.1
