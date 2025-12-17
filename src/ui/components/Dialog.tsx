/**
 * Dialog 组件 - 通用对话框组件
 * 用于显示模态对话框,提供统一的样式和交互
 */

import { type ReactNode } from 'react';

interface DialogProps {
  /** 是否显示对话框 */
  open: boolean;
  /** 关闭对话框回调 */
  onClose: () => void;
  /** 对话框标题 */
  title: string;
  /** 对话框内容 */
  children: ReactNode;
  /** 底部操作按钮 */
  actions?: ReactNode;
  /** 最大宽度,默认 'md' */
  maxWidth?: 'sm' | 'md' | 'lg';
}

/**
 * 对话框组件
 */
export function Dialog({ open, title, children, actions, maxWidth = 'md' }: DialogProps) {
  if (!open) return null;

  // 最大宽度样式映射
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`bg-white rounded-lg shadow-xl ${maxWidthClasses[maxWidth]} w-full mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-4 space-y-4">{children}</div>

        {/* 底部操作按钮 */}
        {actions && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
}

/**
 * 输入框组件 - 用于对话框中的表单输入
 */
interface DialogInputProps {
  /** 输入框标签 */
  label: string;
  /** 输入框值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 按下回车键回调 */
  onEnter?: () => void;
}

export function DialogInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  onEnter,
}: DialogInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      />
    </div>
  );
}

/**
 * 文本域组件 - 用于对话框中的多行文本输入
 */
interface DialogTextareaProps {
  /** 文本域标签 */
  label: string;
  /** 文本域值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 行数 */
  rows?: number;
}

export function DialogTextarea({
  label,
  value,
  onChange,
  placeholder,
  required,
  rows = 3,
}: DialogTextareaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
      />
    </div>
  );
}

/**
 * 按钮组件 - 用于对话框底部操作按钮
 */
interface DialogButtonProps {
  /** 按钮文本 */
  children: ReactNode;
  /** 点击回调 */
  onClick: () => void;
  /** 按钮类型 */
  variant?: 'primary' | 'secondary';
  /** 是否禁用 */
  disabled?: boolean;
}

export function DialogButton({ children, onClick, variant = 'secondary', disabled }: DialogButtonProps) {
  const variantClasses = {
    primary: disabled
      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
      : 'bg-primary text-white hover:bg-primary/90',
    secondary: 'text-slate-600 hover:bg-slate-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg transition-colors ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}
