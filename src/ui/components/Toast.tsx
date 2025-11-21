/**
 * Toast 通知组件
 * 用于在右上角显示临时提示消息,不阻塞用户操作
 */
import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // 毫秒,默认 3000
}

interface ToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

/**
 * Toast 容器组件
 * 显示所有活动的 Toast 消息
 */
export default function Toast({ messages, onRemove }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onRemove={onRemove} />
      ))}
    </div>
  );
}

/**
 * 单个 Toast 项组件
 */
function ToastItem({ message, onRemove }: { message: ToastMessage; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const duration = message.duration || 3000;

  const handleClose = () => {
    setIsExiting(true);
    // 等待退出动画完成后移除
    setTimeout(() => {
      onRemove(message.id);
    }, 300);
  };

  useEffect(() => {
    // 自动关闭定时器
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  // 根据类型选择图标和颜色
  const getTypeStyles = () => {
    switch (message.type) {
      case 'success':
        return {
          icon: <CheckCircle size={20} />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
        };
      case 'error':
        return {
          icon: <AlertCircle size={20} />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500',
        };
      case 'info':
      default:
        return {
          icon: <Info size={20} />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-500',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`
        ${styles.bgColor} ${styles.borderColor} ${styles.textColor}
        border rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px]
        flex items-start gap-3 pointer-events-auto
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
      {/* 图标 */}
      <div className={`flex-shrink-0 ${styles.iconColor}`}>{styles.icon}</div>

      {/* 消息文本 */}
      <div className="flex-1 text-sm font-medium break-words">{message.message}</div>

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className={`flex-shrink-0 ${styles.iconColor} hover:opacity-70 transition-opacity`}
        aria-label="关闭"
      >
        <X size={18} />
      </button>
    </div>
  );
}
