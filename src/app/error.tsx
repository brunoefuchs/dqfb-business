'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8">
      <div className="text-center max-w-2xl">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-primary mb-6">
          Erro inesperado
        </p>
        <h1 className="font-display editorial-title text-5xl md:text-6xl font-bold text-primary mb-8">
          Algo <i className="font-black">imprevisto</i> aconteceu
        </h1>
        <p className="font-body text-lg text-on-surface-variant mb-12 leading-relaxed">
          Encontramos uma turbulência ao processar sua requisição. Tente novamente ou retorne ao controle.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-3 bg-primary text-white px-8 py-4 font-body text-xs uppercase tracking-widest font-bold hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
