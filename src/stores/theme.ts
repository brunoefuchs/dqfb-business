import { create } from 'zustand';

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
  setDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: false,
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next);
      }
      return { isDark: next };
    }),
  setDark: (isDark) =>
    set(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', isDark);
      }
      return { isDark };
    }),
}));
