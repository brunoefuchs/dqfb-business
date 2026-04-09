# Deployment Guide

Guia completo para deploy do DQFB Business em produção via Vercel.

## Visão Geral

| Item | Valor |
|------|-------|
| **Plataforma** | [Vercel](https://vercel.com/) |
| **Framework Preset** | Next.js (auto-detectado) |
| **Build Command** | `next build` |
| **Output Directory** | `.next` |
| **Node.js Version** | 20.x |
| **CI/CD** | GitHub Actions + Vercel Git Integration |
| **Tipo de Deploy** | SSG (Static Site Generation) |

## Setup Inicial (Vercel)

### 1. Conectar repositório

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique em **Add New Project**
3. Importe o repositório `brunoefuchs/dqfb-business`
4. A Vercel auto-detecta Next.js — não altere as configurações de build

### 2. Configurar variáveis de ambiente

Em **Project Settings → Environment Variables**, adicione:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_MODULE_TRANSCRICAO_URL` | URL real | Production, Preview, Development |
| `NEXT_PUBLIC_MODULE_FINANCEIRO_URL` | URL real | Production, Preview, Development |
| `NEXT_PUBLIC_MODULE_FINANCEIRO_PESSOAL_URL` | URL real | Production, Preview, Development |
| `NEXT_PUBLIC_MODULE_TALK_URL` | URL real | Production, Preview, Development |
| `NEXT_PUBLIC_MODULE_CURADORIA_URL` | URL real | Production, Preview, Development |

> **Importante:** Variáveis com prefixo `NEXT_PUBLIC_` são embutidas no bundle no momento do build. Após alterar, é necessário fazer **redeploy**.

### 3. Deploy inicial

A Vercel faz deploy automático ao detectar o primeiro push em `main`. URLs:

- **Production:** `https://dqfb-business.vercel.app` (ou domínio Vercel auto-gerado)
- **Preview:** Cada PR gera uma URL única `https://dqfb-business-<hash>.vercel.app`

## Custom Domain

### 1. Adicionar domínio na Vercel

1. **Project Settings → Domains**
2. Adicione seu domínio (ex: `dqfb.business`)
3. Vercel mostra os registros DNS necessários

### 2. Configurar DNS no provedor

**Opção A — A Record (apex domain):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Opção B — CNAME (subdomain como www):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. Atualizar metadataBase

Após configurar o custom domain, atualize `src/app/layout.tsx`:

```typescript
metadataBase: new URL('https://seu-dominio.com'),
```

E faça commit/push para refletir nas tags OG e sitemap.

## CI/CD Pipeline

### GitHub Actions

O workflow `.github/workflows/deploy.yml` executa em cada push e PR:

```yaml
jobs:
  quality:
    - npm ci
    - npx eslint src
    - npx tsc --noEmit
    - npm run build
```

**Quality gates obrigatórios** antes do merge para `main`:
- ✅ Lint (ESLint)
- ✅ Typecheck (TypeScript)
- ✅ Build (Next.js)

A Vercel só faz deploy se o commit em `main` está saudável (não bloqueia, mas é boa prática usar branch protection).

### Branch Protection (Recomendado)

Em **Settings → Branches → Add branch protection rule** para `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Selecione o workflow `Deploy / quality`
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (opcional)

## Workflows de Deploy

### Deploy Automático (Continuous Deployment)

```
Push em main → GitHub Actions valida → Vercel faz build → Deploy production
```

### Preview Deploy (Pull Requests)

```
Push em feature branch → GitHub Actions valida → Vercel cria preview URL
```

A Vercel comenta automaticamente no PR com a preview URL.

### Rollback

**Via Vercel Dashboard:**
1. Acesse **Deployments**
2. Encontre o deployment estável anterior
3. Clique em **Promote to Production**

**Via Git:**
```bash
git revert <commit-hash>
git push origin main
```

## Verificar Deploy

### Status via GitHub CLI

```bash
# Listar workflow runs recentes
gh run list --limit 5

# Ver detalhes de um run específico
gh run view <run-id>

# Listar deploys recentes
gh api repos/brunoefuchs/dqfb-business/deployments --jq '.[0:3] | .[] | {ref, environment, created_at}'
```

### Status via Vercel CLI (opcional)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Listar deploys
vercel ls
```

## Páginas Especiais Auto-Geradas

O Next.js gera automaticamente estas rotas:

| Rota | Descrição |
|------|-----------|
| `/` | Home page (portal) |
| `/_not-found` | 404 customizada |
| `/sitemap.xml` | Sitemap (gerado por `app/sitemap.ts`) |
| `/robots.txt` | Robots (gerado por `app/robots.ts`) |
| `/icon` | Favicon dinâmico |
| `/apple-icon` | Apple touch icon |
| `/opengraph-image` | OG image dinâmica (1200x630) |

## Métricas e Monitoramento

### Vercel Analytics (recomendado)

1. **Project Settings → Analytics**
2. Habilite **Web Analytics**
3. Não requer código adicional

### Vercel Speed Insights

1. **Project Settings → Speed Insights**
2. Habilite para medir Web Vitals reais
3. Adicione no `layout.tsx`:

```bash
npm install @vercel/speed-insights
```

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';

// No body do RootLayout:
<SpeedInsights />
```

## Troubleshooting

### Build falha na Vercel mas funciona localmente

- Verifique a versão do Node.js na Vercel: **Project Settings → General → Node.js Version** (deve ser 20.x)
- Confirme que `package-lock.json` está sincronizado (`npm ci` no CI)
- Verifique env vars `NEXT_PUBLIC_*` configuradas na Vercel

### Imagens não carregam

- Hosts externos devem estar em `next.config.ts` → `images.remotePatterns`
- Atualmente configurado: `images.unsplash.com`

### Deploy lento

- Build SSG é rápido (< 30s normalmente)
- Se muito lento, verifique cache de dependências em **Project Settings → General → Build & Development Settings**

### Custom domain não propaga

- DNS pode levar até 48h para propagar
- Verifique com `dig seu-dominio.com` ou [whatsmydns.net](https://whatsmydns.net)
- Vercel também mostra status do SSL na **Project Settings → Domains**

## Checklist de Go-Live

Antes de divulgar o portal publicamente:

- [ ] Todas as 5 URLs dos módulos configuradas em production
- [ ] Custom domain configurado e SSL ativo
- [ ] `metadataBase` atualizado em `layout.tsx`
- [ ] Sitemap acessível: `https://seu-dominio.com/sitemap.xml`
- [ ] Robots acessível: `https://seu-dominio.com/robots.txt`
- [ ] OG image renderizando: `https://seu-dominio.com/opengraph-image`
- [ ] Favicon visível na aba do navegador
- [ ] Lighthouse score >= 90 (Performance, A11y, SEO)
- [ ] Verificado em mobile real
- [ ] Verificado em dark mode
- [ ] Verificado todos os 5 botões de módulo
- [ ] Branch protection ativada em `main`
