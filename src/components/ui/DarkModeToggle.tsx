'use client';

import { useThemeStore } from '@/stores/theme';

export function DarkModeToggle() {
  const { isDark, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-[#881D28] dark:text-[#EDD4D7] cursor-pointer hover:opacity-80 transition-all"
    >
      <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
    </button>
  );
}
