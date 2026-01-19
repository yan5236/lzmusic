import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyThemeMode, getInitialThemeMode, getSystemTheme, persistThemeMode } from '../utils/themeMode';
import type { ThemeMode } from '../utils/themeMode';

type ResolvedTheme = Exclude<ThemeMode, 'system'>;

export function useThemeMode() {
  const initialSystemTheme = getSystemTheme();
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(initialSystemTheme);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedMode = getInitialThemeMode();
    applyThemeMode(storedMode, initialSystemTheme);
    return storedMode;
  });

  const resolvedTheme = useMemo(
    () => (themeMode === 'system' ? systemTheme : themeMode),
    [systemTheme, themeMode]
  );

  useEffect(() => {
    applyThemeMode(themeMode, systemTheme);
  }, [systemTheme, themeMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  const updateThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    persistThemeMode(mode);
  }, []);

  return { themeMode, resolvedTheme, systemTheme, updateThemeMode };
}
