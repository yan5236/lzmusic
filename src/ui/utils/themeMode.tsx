export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_MODE_KEY = 'themeMode';

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'system' || value === 'light' || value === 'dark';

export const getInitialThemeMode = (): ThemeMode => {
  const stored = localStorage.getItem(THEME_MODE_KEY);
  return isThemeMode(stored) ? stored : 'system';
};

export const persistThemeMode = (mode: ThemeMode) => {
  localStorage.setItem(THEME_MODE_KEY, mode);
};

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * 中文注释：根据用户设置与系统主题，统一应用到根节点，确保界面即时切换。
 */
export const applyThemeMode = (mode: ThemeMode, systemTheme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  const resolved = mode === 'system' ? systemTheme : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
};
