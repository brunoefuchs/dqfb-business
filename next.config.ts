import type { NextConfig } from 'next';

/**
 * Headers de segurança — recon OWASP 2026-08-13, findings A05-01 (HIGH 8.2) e A05-17.
 *
 * Antes: este arquivo era `const nextConfig: NextConfig = {}` — 5 linhas, objeto vazio.
 * Nenhum header de segurança em lugar nenhum: sem `headers()`, sem `vercel.json`, sem
 * `middleware.ts`. O único presente em produção (HSTS) vinha do default da Vercel.
 *
 * Por que importa aqui: `/paineldqfb` guarda a credencial Basic do admin em
 * `sessionStorage`. Sem CSP, qualquer XSS vira roubo dessa credencial; sem trava de
 * enquadramento, as ações de curadoria ficam expostas a clickjacking.
 */

const SUPABASE = 'https://xwiomidydfappnrrsjqh.supabase.co';

/**
 * CSP base.
 *
 * `script-src 'unsafe-inline'` é exigido pelos scripts de hidratação do App Router
 * enquanto não houver middleware emitindo nonce. `style-src 'unsafe-inline'` é exigido
 * pelo Tailwind v4 e pelos estilos inline do painel. `fonts.googleapis.com` está aqui
 * porque `src/app/layout.tsx:79` carrega o Material Symbols por <link> (as fontes do
 * next/font já são self-hosted).
 *
 * `connect-src` conferido no código, não presumido: `/paineldqfb` chama
 * `functions/v1/admin-painel` e `/lu-curso` chama `functions/v1/tutor-curso` — ambos no
 * mesmo host do Supabase. Nenhuma outra origem externa aparece em `src/`.
 */
const cspBase = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${SUPABASE}`,
  'upgrade-insecure-requests',
];

/** Headers que valem para o site inteiro, inclusive dentro do iframe. */
const comuns = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // tira o `x-powered-by: Next.js` (A05-17)
  productionBrowserSourceMaps: false, // hoje é o default; explícito para amanhã não ser
  async headers() {
    return [
      // ─────────────────────────────────────────────────────────────────────
      // 1) /lu-curso — SEM trava de enquadramento, de propósito
      // ─────────────────────────────────────────────────────────────────────
      // Esta página roda DENTRO de um <iframe> numa aula da Hotmart
      // (ver o cabeçalho de src/app/lu-curso/page.tsx). Um X-Frame-Options: DENY
      // global, ou um frame-ancestors errado, MATA a Lu do curso na área de membros.
      //
      // O relatório propõe `frame-ancestors https://*.hotmart.com ...`, com o aviso
      // de confirmar o domínio exato antes de subir. Esse domínio NÃO está no código
      // nem nos runbooks — só se descobre no DevTools dentro do iframe real.
      //
      // Em vez de chutar, esta rota fica sem restrição de enquadramento: ganha os
      // headers comuns e um CSP sem `frame-ancestors`. O clickjacking que o finding
      // descreve é sobre as ações de CURADORIA, que vivem em /paineldqfb — e essa
      // rota está travada no bloco 2. Aqui não há ação destrutiva a proteger.
      //
      // ➜ Quando o domínio for confirmado, acrescentar a este CSP:
      //      "frame-ancestors https://<dominio-da-area-de-membros>"
      {
        source: '/lu-curso',
        headers: [
          ...comuns,
          { key: 'Content-Security-Policy', value: cspBase.join('; ') },
        ],
      },
      // ─────────────────────────────────────────────────────────────────────
      // 2) Todo o resto — inclusive /paineldqfb — nunca pode ser enquadrado
      // ─────────────────────────────────────────────────────────────────────
      // O regex negativo exclui /lu-curso para o bloco 1 valer sozinho lá.
      {
        source: '/((?!lu-curso).*)',
        headers: [
          ...comuns,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          {
            key: 'Content-Security-Policy',
            value: [...cspBase, "frame-ancestors 'none'"].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
