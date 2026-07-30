import type { Metadata } from 'next';

/**
 * A Lu do Curso vive DENTRO de um iframe na área de membros da Hotmart.
 *
 * `noindex` é obrigatório, não estético: sem ele o Google indexa uma página de
 * chat solta, e quem cair nela de fora do curso queima o teto de custo da Lu sem
 * nunca ter sido aluna. A página não é secreta — é só endereçada ao iframe.
 */
export const metadata: Metadata = {
  title: 'Lu · Doce que Faz Bem',
  description: 'A IA do curso Doce que Faz Bem.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function LuCursoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
