import { useCallback, useState } from 'react';
import type { ToastMessage } from '../components/Toast';

type ToastType = ToastMessage['type'];

export function useToastManager() {
  // 本地维护 toast 列表，提供添加/移除工具函数
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = { id, message, type, duration };
      setToastMessages((prev) => [...prev, newToast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToastMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  return { toastMessages, showToast, removeToast };
}
