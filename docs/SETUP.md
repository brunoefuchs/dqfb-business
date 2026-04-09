# Setup Guide

Guia completo para configurar o ambiente de desenvolvimento do DQFB Business.

## Pré-requisitos

| Ferramenta | Versão | Verificar |
|------------|--------|-----------|
| Node.js | 20.x ou superior | `node --version` |
| npm | 10.x ou superior | `npm --version` |
| Git | 2.x ou superior | `git --version` |
| GitHub CLI | 2.x ou superior (opcional) | `gh --version` |

### Instalação dos Pré-requisitos

**Windows (winget):**
```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install GitHub.cli
```

**macOS (Homebrew):**
```bash
brew install node@20 git gh
```

**Linux (apt):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs git gh
```

## Setup do Projeto

### 1. Clone o repositório

```bash
git clone https://github.com/brunoefuchs/dqfb-business.git
cd dqfb-business
```

### 2. Instale as dependências

```bash
npm install
```

> **Nota:** O projeto usa Tailwind v4 com `@theme` directive em CSS. Não há `tailwind.config.ts`.

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e preencha as URLs reais dos módulos:

```bash
NEXT_PUBLIC_MODULE_TRANSCRICAO_URL=https://transcricao.dqfb.com
NEXT_PUBLIC_MODULE_FINANCEIRO_URL=https://financeiro.dqfb.com
NEXT_PUBLIC_MODULE_FINANCEIRO_PESSOAL_URL=https://pessoal.dqfb.com
NEXT_PUBLIC_MODULE_TALK_URL=https://talk.dqfb.com
NEXT_PUBLIC_MODULE_CURADORIA_URL=https://curadoria.dqfb.com
```

> Para desenvolvimento, valores placeholder funcionam — os botões ainda renderizam mas redirecionam para `#`.

### 4. Inicie o dev server

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Comandos de Desenvolvimento

```bash
# Dev server (Turbopack)
npm run dev

# Build de produção
npm run build

# Lint
npm run lint
# ou
npx eslint src

# Type check
npm run typecheck
# ou
npx tsc --noEmit

# Testes
npm test
npm run test:watch
```

## Estrutura de Arquivos Importantes

### `src/app/globals.css`
Contém todos os tokens do design system via Tailwind v4 `@theme`. **Não criar** `tailwind.config.ts` — Tailwind v4 usa CSS-first config.

### `src/lib/fonts.ts`
Configuração de fontes via `next/font/google`. Adiciona variáveis CSS `--font-fraunces`, `--font-manrope`, `--font-noto-serif`.

### `src/config/modules.ts`
Definição dos 5 módulos do portal. Para adicionar/modificar módulos, edite este arquivo.

### `src/components/`
- `layout/` — Header, Footer
- `sections/` — HeroSection, ModulesGrid, QuoteSection
- `cards/` — ModuleCard
- `ui/` — DarkModeToggle

## Convenções de Código

### Nomeação
- **Componentes React:** PascalCase (`ModuleCard.tsx`)
- **Hooks/Stores:** camelCase com prefixo `use` (`useThemeStore`)
- **Utilities:** camelCase (`fonts.ts`)
- **Types:** PascalCase (`ModuleConfig`)

### Imports
- Use alias `@/` para imports relativos a `src/`
- Tipos primeiro com `import type`
- Componentes em named exports (não default)

```typescript
// ✅ Bom
import type { ModuleConfig } from '@/types/module';
import { ModuleCard } from '@/components/cards/ModuleCard';

// ❌ Evitar
import ModuleCard from '../../components/cards/ModuleCard';
```

### Tailwind
- Siga o design system rigorosamente — não criar tokens novos sem necessidade
- Use classes utilitárias do `@theme` (ex: `bg-primary` em vez de `bg-[#680114]`)
- Para tokens não mapeados (ex: `#680114` direto), use arbitrary values

## Troubleshooting

### Build falha com erro de Tailwind
- Verifique se `postcss.config.mjs` usa `@tailwindcss/postcss`
- Confirme que `globals.css` tem `@import "tailwindcss";` no topo

### Fontes não carregam
- Verifique conexão com Google Fonts
- Confirme que `layout.tsx` aplica as classes `${fraunces.variable}` no `<html>`

### Material Symbols não renderiza
- Confirme que o `<link>` para Material Symbols está no `<head>` do `layout.tsx`
- Verifique conectividade com `fonts.googleapis.com`

### `npm ci` falha em CI
- Sincronize `package-lock.json` localmente: `rm -rf node_modules package-lock.json && npm install`
- Faça commit do `package-lock.json` atualizado

## Próximos Passos

- Leia o [PRD](prd.md) para entender os requisitos do produto
- Leia a [Architecture](architecture.md) para entender as decisões técnicas
- Veja [Stories](stories/) para implementação detalhada de cada feature
- Consulte [DEPLOYMENT.md](DEPLOYMENT.md) para deploy em produção
