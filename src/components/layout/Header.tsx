import Link from 'next/link';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';

const navLinks = [
  { href: '#transcricao', label: 'Transcrição', active: true },
  { href: '#financeiro', label: 'Financeiro', active: false },
  { href: '#talk', label: 'Talk', active: false },
  { href: '#curadoria', label: 'Curadoria', active: false },
];

export function Header() {
  return (
    <>
      <header className="w-full top-0 sticky z-50 bg-[#F8F4F3] dark:bg-stone-950 flex justify-between items-center px-8 py-4 max-w-full mx-auto">
        <div className="font-serif font-bold text-[#881D28] dark:text-[#EDD4D7] text-xl uppercase tracking-widest">
          DQFB Business
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.active
                  ? 'text-[#881D28] dark:text-[#CE3B87] border-b-2 border-[#881D28] pb-1 font-bold hover:text-[#881D28] transition-colors duration-300'
                  : 'text-stone-500 dark:text-stone-400 font-medium hover:text-[#881D28] transition-colors duration-300'
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-[#881D28] dark:text-[#EDD4D7]">
            <DarkModeToggle />
            <span className="material-symbols-outlined cursor-pointer hover:opacity-80 transition-all">
              notifications
            </span>
            <span className="material-symbols-outlined cursor-pointer hover:opacity-80 transition-all">
              settings
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container ring-2 ring-outline-variant/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#881D28]">person</span>
          </div>
        </div>
      </header>
      <div className="bg-[#EDD4D7] dark:bg-stone-900 h-px w-full" />
    </>
  );
}
