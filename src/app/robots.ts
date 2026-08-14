import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // A01-08/A05-09 do recon OWASP 2026-08-13. Nenhuma das duas é área pública:
      // `/paineldqfb` é o painel admin (Basic Auth) e `/lu-curso` roda dentro do
      // iframe da área de membros da Hotmart. Indexadas, viram alvo achável por
      // busca em vez de por quem já sabe o endereço.
      //
      // ⚠️ Isto NÃO é controle de acesso — robots.txt é uma convenção que crawler
      // hostil ignora. A barreira continua sendo o Basic Auth + rate limit da edge.
      // Serve para reduzir a superfície descoberta por acaso, não para proteger.
      disallow: ['/paineldqfb', '/lu-curso'],
    },
    sitemap: 'https://www.businessdqfb.francielecaleffi.com.br/sitemap.xml',
  };
}
