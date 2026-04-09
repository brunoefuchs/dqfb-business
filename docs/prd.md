# DQFB Business — Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Centralizar o acesso a todos os sistemas DQFB em um portal unificado com identidade visual premium
- Oferecer ao proprietário do negócio uma visão de controle sobre 5 módulos: **Transcrição**, **Financeiro DQFB**, **Financeiro Pessoal**, **Talk DQFB** e **Curadoria DQFB**
- Transmitir posicionamento de marca sofisticado ("The Velvet Editorial") em cada ponto de contato
- Servir como ponto de entrada único para operação do ecossistema DQFB Business

### Background Context

O DQFB Business é um ecossistema de ferramentas para gestão empresarial. Cada sistema (transcrição de áudio, controle financeiro corporativo e pessoal, comunicação interna e curadoria de conteúdo) já existe como sistema externo independente. O portal resolve a fragmentação servindo como "sala de controle" — uma landing page com design editorial de alto padrão que direciona o usuário para cada módulo, garantindo coesão visual e operacional. Os módulos não serão reconstruídos — apenas interligados pelo portal.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-04-08 | 0.1 | Criação inicial do PRD | Morgan (PM) |

---

## Requirements

### Functional

- **FR1:** O portal deve exibir os 5 módulos (Transcrição, Financeiro DQFB, Financeiro Pessoal, Talk DQFB, Curadoria DQFB) como cards na página principal, cada um com título, descrição, label de módulo e botão de acesso
- **FR2:** Cada card de módulo deve redirecionar o usuário para o sistema externo correspondente ao clicar no botão de ação
- **FR3:** O portal deve possuir navegação superior (top nav) sticky com links para cada módulo e marca DQFB Business
- **FR4:** O portal deve exibir área de usuário no header com avatar, ícone de notificações e ícone de configurações
- **FR5:** O portal deve exibir a seção hero editorial com título "Controle DQFB" e descrição do ecossistema
- **FR6:** O portal deve exibir a seção de citação editorial com imagem grayscale (hover para colorida) e blockquote
- **FR7:** O portal deve incluir footer com marca DQFB Business e links de Privacy Policy, Terms of Service e Contact Support

### Non Functional

- **NFR1:** O portal deve ser responsivo: desktop (5 colunas de cards), tablet (2 colunas) e mobile (1 coluna)
- **NFR2:** O design deve seguir fielmente o Design System "The Velvet Editorial" documentado em `telas/DESIGN.md`
- **NFR3:** Tempo de carregamento da página principal deve ser inferior a 2 segundos em conexões 4G
- **NFR4:** O portal deve suportar dark mode conforme tokens de cor definidos no design system
- **NFR5:** Tipografia deve usar Fraunces (headlines), Manrope (body) e Noto Serif (brand) via Google Fonts
- **NFR6:** O portal deve funcionar nos navegadores Chrome, Firefox, Safari e Edge (últimas 2 versões)

---

## User Interface Design Goals

### Overall UX Vision

Portal editorial de alto padrão visual que funciona como "revista digital executiva" — cada módulo é apresentado como uma seção editorial curada. A experiência deve transmitir sofisticação, clareza e controle. O usuário sente que está acessando um ecossistema premium, não um dashboard genérico de SaaS.

### Key Interaction Paradigms

- **Card-based navigation:** 5 cards verticais de 480px como ponto de entrada para cada módulo, com hover elevando o card (-translate-y-2)
- **Editorial scrolling:** Página single-scroll com seções hero → cards → citação → footer
- **Top nav contextual:** Navegação sticky com tabs para cada módulo, indicador de aba ativa com border-bottom
- **Minimal interaction:** Sem formulários complexos na landing — foco em direcionar para os sistemas externos

### Core Screens and Views

- **Portal Home:** Hero editorial + grid de 5 módulos + citação editorial + footer (tela principal e única)

### Accessibility

WCAG AA — Contraste suficiente garantido pelos tokens (primary #680114 sobre branco atende AA).

### Branding

Design System "The Velvet Editorial" documentado em `telas/DESIGN.md`:
- Paleta: Velvet (#881D28), Precious (#0C453E), Pinky (#CE3B87), Cream (#EDD4D7, #F8F4F3)
- Regra "No-Line": sem borders 1px, separação por cor de fundo
- Tipografia: Fraunces (display), Manrope (body), Noto Serif (brand)
- Cantos afiados (0.125rem default) — estética "tailored"
- Sombras tintadas, não cinza puro
- Glassmorphism para elementos flutuantes (blur 16px+)

### Target Devices and Platforms

Web Responsive — Desktop first (grid 5 colunas), adapta para tablet (2 colunas) e mobile (1 coluna). Sem apps nativos no escopo.

---

## Technical Assumptions

### Repository Structure: Monorepo

Um único repositório `dqfb-business` contendo o portal. Cada módulo externo vive em seu próprio repositório/sistema separado.

### Service Architecture

Monolith (Next.js App) — O portal é uma aplicação Next.js standalone. Sem microsserviços. O portal é essencialmente uma aplicação frontend que redireciona para sistemas externos.

### Tech Stack (preset `nextjs-react`)

| Categoria | Tecnologia | Rationale |
|-----------|-----------|-----------|
| Framework | Next.js 16+ (App Router) | Preset ativo, SSR/SSG para performance |
| UI | React + TypeScript | Type-safety, componentização |
| Styling | Tailwind CSS | Protótipo já em Tailwind, tokens mapeiam diretamente |
| Fontes | Fraunces, Manrope, Noto Serif | Definido no design system |
| Ícones | Material Symbols Outlined | Já usado no protótipo |
| State | Zustand | Para dark mode toggle |
| Deploy | Vercel | Deploy natural para Next.js |

### Testing Requirements

Unit + Integration — Testes unitários para componentes. Testes de integração para rotas e navegação. Sem E2E complexo dado que a lógica está nos sistemas externos.

### Additional Technical Assumptions

- O protótipo HTML em `telas/code.html` serve como referência visual, será reconstruído em componentes React/Next.js
- Dark mode via class `dark` no Tailwind (já configurado no protótipo)
- Todos os tokens de cor do design system configurados no `tailwind.config.ts`
- URLs dos sistemas externos configuráveis via variáveis de ambiente
- Sem banco de dados — portal estático, sem autenticação no MVP

---

## Epic List

### Epic 1: Portal DQFB Business — Foundation & Implementation

Estabelecer a infraestrutura do projeto Next.js e implementar o portal completo com todos os componentes visuais, navegação e responsividade seguindo o Design System "The Velvet Editorial".

**Rationale:** Como o portal é essencialmente uma single-page premium sem lógica de negócio complexa (os módulos são sistemas externos), um único epic é suficiente para entregar valor completo. Cada story entrega uma fatia vertical funcional e visualmente testável.

---

## Epic 1: Portal DQFB Business — Foundation & Implementation

**Goal:** Implementar o portal DQFB Business como aplicação Next.js com o design system "The Velvet Editorial", servindo como hub centralizado para os 5 módulos de negócio existentes. Ao final do epic, o portal estará deployado e funcional com navegação para todos os sistemas externos.

### Story 1.1: Project Scaffolding & Design System Setup

**As a** developer,
**I want** a Next.js project configured with the DQFB Business design system tokens,
**so that** all subsequent components follow the established visual identity.

#### Acceptance Criteria

1. Projeto Next.js 16+ inicializado com App Router e TypeScript
2. Tailwind CSS configurado com todos os tokens de cor do design system (`primary`, `secondary`, `tertiary`, `surface-*`, `on-*`, `outline-*`)
3. Fontes Google configuradas: Fraunces (display), Manrope (body), Noto Serif (brand)
4. Material Symbols Outlined carregado
5. Classes utilitárias criadas: `.font-display`, `.font-serif`, `.editorial-title`
6. Dark mode configurado via `darkMode: "class"` no Tailwind
7. ESLint e Prettier configurados
8. `npm run dev` inicia o servidor sem erros e exibe página em branco com fonte correta
9. Variáveis de ambiente para URLs dos módulos externos definidas em `.env.example`

### Story 1.2: Header & Navigation

**As a** user,
**I want** a sticky navigation bar with the DQFB Business brand and module links,
**so that** I can identify the portal and navigate to modules from any scroll position.

#### Acceptance Criteria

1. Header sticky com fundo `#F8F4F3` (light) / `stone-950` (dark)
2. Logo "DQFB Business" em Noto Serif bold, cor `#881D28`, uppercase com tracking widest
3. Links de navegação: Transcrição, Financeiro, Talk, Curadoria — com estado ativo (border-bottom `#881D28`, font-bold)
4. Links inativos em `stone-500` com hover para `#881D28`
5. Área de usuário à direita: ícones de notificações e settings (Material Symbols), avatar circular com ring
6. Navegação desktop oculta em mobile (hidden md:flex)
7. Divisor `#EDD4D7` de 1px abaixo do header

### Story 1.3: Hero Section

**As a** user,
**I want** to see an editorial hero section when landing on the portal,
**so that** I immediately understand the purpose and brand identity of DQFB Business.

#### Acceptance Criteria

1. Layout grid 12 colunas, conteúdo ocupa 8 colunas em desktop
2. Título "Controle *DQFB*" em Fraunces, 7xl desktop / 6xl mobile, cor `primary`, com "DQFB" em italic font-black
3. Subtítulo descritivo em Manrope, xl, cor `on-surface-variant`, max-w-2xl
4. Margin bottom de 80px (mb-20) separando hero dos cards
5. Classe `editorial-title` aplicada: letter-spacing -0.02em, line-height 1.1

### Story 1.4: Module Cards Grid

**As a** user,
**I want** to see the 5 business modules presented as elegant cards,
**so that** I can quickly access any system in the DQFB ecosystem.

#### Acceptance Criteria

1. Grid responsivo: 5 colunas (lg), 2 colunas (sm), 1 coluna (mobile)
2. Cada card tem 480px de altura, padding 32px, flex column com justify-between
3. Card 1 (Transcrição): fundo `primary` (#680114), label "Módulo Alpha", ícone record_voice_over
4. Card 2 (Financeiro DQFB): fundo `secondary` (#0C453E), label "Módulo Corporate", ícone payments
5. Card 3 (Financeiro Pessoal): fundo `tertiary-container` (#8C0055), label "Módulo Personal", ícone account_balance_wallet (filled)
6. Card 4 (Talk DQFB): fundo `#680114`, label "Módulo Connect", ícone forum
7. Card 5 (Curadoria DQFB): fundo `#0C453E`, label "Módulo Insight", ícone auto_awesome (filled)
8. Hover: card sobe 8px (-translate-y-2) com transição 500ms
9. Ícone de fundo no canto superior direito, opacidade 20% → 40% no hover
10. Botão branco full-width com texto da cor do card, uppercase, tracking widest, com seta arrow_forward
11. Botões redirecionam para URLs configuradas via variáveis de ambiente
12. Labels em 10px uppercase tracking-widest com fundo white/10

### Story 1.5: Editorial Quote Section & Footer

**As a** user,
**I want** to see an editorial quote and professional footer,
**so that** the portal feels complete and reinforces the premium brand positioning.

#### Acceptance Criteria

1. Seção citação: grid 12 colunas, imagem (5 cols) + quote (7 cols)
2. Imagem em grayscale por padrão, transição para colorida no hover (duration-700)
3. Blockquote em Fraunces italic 4xl com citação editorial
4. Cite em label 10px uppercase tracking-[0.3em] cor primary
5. Border-left com outline-variant/30 separando imagem do texto
6. Margin top de 128px (mt-32) entre cards e citação
7. Footer: fundo `#F8F4F3`, logo DQFB Business, links (Privacy Policy, Terms of Service, Contact Support) em 10px uppercase, copyright
8. Divisor `#EDD4D7` de 1px acima do footer

### Story 1.6: Dark Mode & Responsive Polish

**As a** user,
**I want** the portal to work flawlessly on all devices and support dark mode,
**so that** I have a consistent premium experience regardless of context.

#### Acceptance Criteria

1. Dark mode toggle funcional — alterna classe `dark` no HTML root
2. Cores dark mode aplicadas: backgrounds `stone-950`/`stone-900`, textos `#EDD4D7`, links `#CE3B87`
3. Cards mantêm cores próprias em dark mode (são sempre escuros)
4. Mobile: navegação oculta, cards em 1 coluna, hero em font 6xl → 4xl, citação em stack vertical
5. Tablet: cards em 2 colunas, hero mantém proporção
6. Sem scroll horizontal em nenhum breakpoint
7. Todas as transições (hover cards, grayscale imagem, links) funcionam em touch devices
8. Lighthouse performance score >= 90 em desktop

### Story 1.7: Deploy & Go-Live

**As a** owner,
**I want** the portal deployed and accessible via URL pública,
**so that** I can acessar meus sistemas de qualquer lugar.

#### Acceptance Criteria

1. Aplicação deployada na Vercel com domínio funcional
2. Variáveis de ambiente dos módulos configuradas na Vercel
3. HTTPS ativo
4. Build sem erros ou warnings
5. Todas as fontes carregando corretamente (Google Fonts)
6. Links dos 5 módulos redirecionando para as URLs corretas dos sistemas externos
7. Responsividade verificada em dispositivo real (mobile)

---

## Checklist Results Report

### Executive Summary

- **PRD Completeness:** ~85%
- **MVP Scope:** Just Right — portal hub sem lógica de negócio, 7 stories sequenciais
- **Readiness for Architecture:** Ready — stack definida (Next.js preset), design system documentado, protótipo HTML existente
- **Most Critical Gap:** Sem autenticação definida no MVP (deliberado — sistemas externos gerenciam auth)

### Category Statuses

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| 1. Problem Definition & Context | PASS | — |
| 2. MVP Scope Definition | PASS | Scope intencionalmente mínimo (portal only) |
| 3. User Experience Requirements | PASS | Protótipo HTML fornece referência completa |
| 4. Functional Requirements | PASS | 7 FRs claros e testáveis |
| 5. Non-Functional Requirements | PARTIAL | Sem métricas de uptime/SLA definidas |
| 6. Epic & Story Structure | PASS | 1 epic, 7 stories sequenciais |
| 7. Technical Guidance | PASS | Preset nextjs-react ativo, stack completa |
| 8. Cross-Functional Requirements | PARTIAL | Sem integrações de API documentadas (links diretos) |
| 9. Clarity & Communication | PASS | Design system + protótipo reduzem ambiguidade |

### Critical Deficiencies

Nenhum blocker identificado.

**HIGH:**
- Autenticação não definida — aceitável para MVP se sistemas externos gerenciam auth
- URLs dos sistemas externos precisam ser fornecidas antes do deploy

**MEDIUM:**
- SLA/uptime não especificado
- Estratégia de imagens (hero quote image) — usar asset local ou CDN?

### Final Decision

**READY FOR ARCHITECT** — O PRD está completo e bem estruturado para a fase de arquitetura. A stack está definida, o design system documentado, e o protótipo HTML serve como referência visual inequívoca.

---

## Next Steps

### UX Expert Prompt

> @ux-design-expert — Revise o PRD em `docs/prd.md` e o design system em `telas/DESIGN.md`. Valide a consistência entre o protótipo HTML (`telas/code.html`) e os requisitos de UI. Produza o `frontend-spec.md` com component inventory, spacing system e responsive breakpoints detalhados.

### Architect Prompt

> @architect — Revise o PRD em `docs/prd.md`. Crie a arquitetura técnica para o portal DQFB Business usando o preset `nextjs-react`. O projeto é uma single-page Next.js (App Router) com Tailwind CSS, sem banco de dados, sem autenticação no MVP. O design system está em `telas/DESIGN.md` e o protótipo HTML em `telas/code.html`. Produza o `architecture.md` com estrutura de pastas, componentes, configuração de Tailwind tokens e estratégia de deploy.

---
*Generated by AIOX — Morgan (PM) | 2026-04-08*
