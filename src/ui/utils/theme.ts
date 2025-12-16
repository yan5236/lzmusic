export const DEFAULT_THEME_COLOR = '#2563eb';

export const normalizeThemeColor = (value?: string | null): string | null => {
  if (!value) return null;
  const withHash = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
  const hexMatch = withHash.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!hexMatch) return null;

  if (withHash.length === 4) {
    return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toLowerCase();
  }

  return withHash.toLowerCase();
};

export const applyThemeColor = (color: string) => {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--color-primary', color);
};

export const getInitialThemeColor = (): string => {
  const stored = normalizeThemeColor(localStorage.getItem('themeColor'));
  return stored ?? DEFAULT_THEME_COLOR;
};

export const persistThemeColor = (color: string) => {
  localStorage.setItem('themeColor', color);
};
