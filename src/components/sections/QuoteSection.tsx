export function QuoteSection() {
  return (
    <div className="mt-32 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
      <div className="md:col-span-5">
        <div className="w-full aspect-[4/5] bg-gradient-to-br from-stone-700 to-stone-900 grayscale hover:grayscale-0 transition-all duration-700 shadow-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-9xl text-white/30">meeting_room</span>
        </div>
      </div>
      <div className="md:col-span-7 pl-0 md:pl-12 border-l border-outline-variant/30">
        <blockquote className="font-display text-4xl italic text-on-surface leading-tight mb-6">
          &ldquo;A verdadeira sofisticação não está na complexidade, mas na clareza absoluta com que as decisões são tomadas.&rdquo;
        </blockquote>
        <cite className="font-body text-[10px] uppercase tracking-[0.3em] text-primary block not-italic">
          Conselho Editorial DQFB Business
        </cite>
      </div>
    </div>
  );
}
