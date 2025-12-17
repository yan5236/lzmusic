import { useCallback, useEffect, useState } from 'react';
import {
  applyThemeColor,
  getInitialThemeColor,
  normalizeThemeColor,
  persistThemeColor,
} from '../utils/theme';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;

export function useThemeColor(showToast: ToastFn) {
  // 初始化使用持久化/系统色，并立即应用到 CSS 变量
  const [themeColor, setThemeColor] = useState<string>(() => {
    const initialColor = getInitialThemeColor();
    applyThemeColor(initialColor);
    return initialColor;
  });

  useEffect(() => {
    applyThemeColor(themeColor);
  }, [themeColor]);

  const updateThemeColor = useCallback(
    (color: string) => {
      const normalized = normalizeThemeColor(color);
      if (!normalized) {
        showToast('请输入有效的颜色值', 'error');
        return;
      }
      setThemeColor(normalized);
      persistThemeColor(normalized);
    },
    [showToast]
  );

  return { themeColor, updateThemeColor };
}
