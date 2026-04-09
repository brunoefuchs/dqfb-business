import type { ModuleConfig } from '@/types/module';

interface ModuleCardProps {
  module: ModuleConfig;
}

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <div
      className={`group relative ${module.bgColor} p-8 h-[480px] flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-2`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
        <span
          className="material-symbols-outlined text-9xl text-white"
          style={module.iconFilled ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {module.icon}
        </span>
      </div>
      <div>
        <span className="inline-block px-3 py-1 bg-white/10 text-white font-body text-[10px] tracking-widest uppercase mb-6">
          {module.label}
        </span>
        <h2 className="font-display text-3xl xl:text-4xl text-white font-bold leading-tight">
          {module.title} <br />
          <i className="font-black">{module.subtitle}</i>
        </h2>
      </div>
      <div className="z-10">
        <p className="text-white/80 font-body text-sm mb-8 leading-relaxed">{module.description}</p>
        <a
          href={module.url}
          className={`bg-white ${module.buttonTextColor} px-6 py-3 w-full font-body text-xs uppercase tracking-widest font-bold flex items-center justify-between gap-3 transition-all active:scale-95`}
        >
          {module.buttonText}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
      </div>
    </div>
  );
}
