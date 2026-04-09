import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-grow max-w-[1920px] mx-auto w-full px-8 py-24 flex flex-col items-center justify-center text-center">
        <div className="max-w-2xl">
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-primary mb-6">
            Erro 404
          </p>
          <h1 className="font-display editorial-title text-6xl md:text-7xl font-bold text-primary mb-8">
            Página não <i className="font-black">encontrada</i>
          </h1>
          <p className="font-body text-xl text-on-surface-variant mb-12 leading-relaxed">
            A rota que você procura não existe neste ecossistema. Retorne ao controle DQFB para acessar todos os módulos.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-3 bg-primary text-white px-8 py-4 font-body text-xs uppercase tracking-widest font-bold hover:bg-primary-container transition-colors"
          >
            Voltar ao Controle
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
