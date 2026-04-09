# DQFB Business

> Portal centralizado de gestão para o ecossistema DQFB Business — uma "sala de controle" editorial que conecta os 5 sistemas de negócio em uma única landing page premium.

[![Deploy](https://github.com/brunoefuchs/dqfb-business/actions/workflows/deploy.yml/badge.svg)](https://github.com/brunoefuchs/dqfb-business/actions/workflows/deploy.yml)

---

## Visão Geral

O **DQFB Business** é uma aplicação Next.js que serve como hub unificado para 5 módulos de negócio independentes:

| Módulo | Descrição |
|--------|-----------|
| **Transcrição DQFB** | Transformação de áudio em ativos intelectuais com precisão editorial |
| **Financeiro DQFB** | Tesouraria e fluxo de caixa corporativo com dashboards executivos |
| **Financeiro Pessoal** | Planejamento patrimonial e controle de ativos individuais |
| **Talk DQFB** | Comunicação direta e segura, reuniões e compartilhamento criptografado |
| **Curadoria DQFB** | Conteúdo selecionado e análise macroeconômica diária |

O portal **não implementa** os sistemas — ele os interliga via URLs configuráveis, servindo como ponto de entrada único com identidade visual coesa ("The Velvet Editorial").

## Tech Stack

- **Framework:** [Next.js 16+](https://nextjs.org/) (App Router, SSG)
- **Language:** TypeScript 5
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) com design tokens via `@theme`
- **State:** [Zustand](https://github.com/pmndrs/zustand) (dark mode)
- **Fonts:** Fraunces (display), Manrope (body), Noto Serif (brand) — auto-hospedadas via `next/font`
- **Icons:** Material Symbols Outlined
- **Testing:** Vitest + @testing-library/react
- **Deploy:** [Vercel](https://vercel.com/) (CDN edge global)
- **CI:** GitHub Actions (lint + typecheck + build)

## Quick Start

```bash
# Clonar
git clone https://github.com/brunoefuchs/dqfb-business.git
cd dqfb-business

# Instalar dependências
npm install

# Configurar env vars
cp .env.example .env
# Editar .env com URLs reais dos módulos

# Iniciar dev server
npm run dev

# Build de produção
npm run build
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia dev server com Turbopack |
| `npm run build` | Build de produção (SSG) |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Roda ESLint em `src/` |
| `npm run typecheck` | Roda TypeScript sem emitir |
| `npm run test` | Roda testes unitários (Vitest) |
| `npm run test:watch` | Vitest em modo watch |

## Estrutura do Projeto

```
dqfb-business/
├── docs/                       # Documentação completa
│   ├── prd.md                  # Product Requirements Document
│   ├── architecture.md         # Arquitetura técnica
│   ├── SETUP.md                # Guia de setup
│   ├── DEPLOYMENT.md           # Guia de deploy
│   ├── DESIGN-SYSTEM.md        # Tokens e regras visuais
│   └── stories/                # Stories Epic 1 (1.1 a 1.7)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home (portal)
│   │   ├── not-found.tsx       # 404 customizada
│   │   ├── loading.tsx         # Loading state
│   │   ├── error.tsx           # Error boundary
│   │   ├── icon.tsx            # Favicon dinâmico
│   │   ├── apple-icon.tsx      # Apple touch icon
│   │   ├── opengraph-image.tsx # OG image dinâmica
│   │   ├── sitemap.ts          # Sitemap automático
│   │   ├── robots.ts           # Robots.txt automático
│   │   └── globals.css         # Tailwind tokens (@theme)
│   ├── components/
│   │   ├── layout/             # Header, Footer
│   │   ├── sections/           # HeroSection, ModulesGrid, QuoteSection
│   │   ├── cards/              # ModuleCard
│   │   └── ui/                 # DarkModeToggle
│   ├── config/
│   │   └── modules.ts          # Definição dos 5 módulos
│   ├── stores/
│   │   └── theme.ts            # Zustand store (dark mode)
│   ├── types/
│   │   └── module.ts           # TypeScript interfaces
│   └── lib/
│       └── fonts.ts            # next/font config
├── telas/                      # Design system reference + protótipo HTML
├── .github/workflows/          # GitHub Actions
└── public/                     # Assets estáticos
```

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [PRD](docs/prd.md) | Requisitos de produto, ACs, stories do Epic 1 |
| [Architecture](docs/architecture.md) | Arquitetura técnica, componentes, decisões |
| [Setup Guide](docs/SETUP.md) | Setup local detalhado para desenvolvedores |
| [Deployment Guide](docs/DEPLOYMENT.md) | Vercel, env vars, CI/CD, custom domain |
| [Design System](docs/DESIGN-SYSTEM.md) | Tokens, tipografia, componentes, regras |
| [Changelog](CHANGELOG.md) | Histórico de releases e mudanças |
| [Stories](docs/stories/) | Stories detalhadas do Epic 1 |

## Design System: "The Velvet Editorial"

Identidade visual editorial de alto padrão inspirada em publicações de luxo. Princípios fundamentais:

- **No-Line Rule:** Sem borders 1px — separação por cor de fundo
- **Surface Hierarchy:** Profundidade via tonal layering, não sombras pretas
- **Sharp Corners:** Cantos afiados (`rounded-sm`) para estética "tailored"
- **Typography Mix:** Mistura de regular + italic em headlines (Fraunces)
- **Velvet Palette:** Bordô (#680114), Verde Esmeralda (#0C453E), Pinky (#CE3B87)

Detalhes completos em [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).

## Variáveis de Ambiente

| Variável | Descrição | Required |
|----------|-----------|----------|
| `NEXT_PUBLIC_MODULE_TRANSCRICAO_URL` | URL do sistema de transcrição | Sim |
| `NEXT_PUBLIC_MODULE_FINANCEIRO_URL` | URL do financeiro corporativo | Sim |
| `NEXT_PUBLIC_MODULE_FINANCEIRO_PESSOAL_URL` | URL do financeiro pessoal | Sim |
| `NEXT_PUBLIC_MODULE_TALK_URL` | URL do Talk DQFB | Sim |
| `NEXT_PUBLIC_MODULE_CURADORIA_URL` | URL da curadoria | Sim |

Estas devem ser configuradas tanto localmente (`.env`) quanto na Vercel (Project Settings → Environment Variables).

## Deploy

O projeto faz deploy automático na Vercel a cada push em `main`. PRs geram preview deploys.

**URL de produção:** Configurada via Vercel + GitHub integration.

Para configuração inicial e custom domain, consulte [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Desenvolvimento com AIOX

Este projeto foi desenvolvido usando o framework [Synkra AIOX](https://github.com/synkraai/aiox-fullstack), que orquestra agentes de IA especializados para cada fase do desenvolvimento:

- `@pm` (Morgan) — Criação de PRDs e épicos
- `@architect` (Aria) — Arquitetura técnica
- `@sm` (River) — Criação de stories
- `@po` (Pax) — Validação de stories
- `@dev` (Dex) — Implementação
- `@qa` (Quinn) — Quality gates
- `@devops` (Gage) — Push, PR, deploy

Veja [AGENTS.md](AGENTS.md) para detalhes sobre o sistema de agentes.

## Licença

Proprietário — DQFB Business © 2026
