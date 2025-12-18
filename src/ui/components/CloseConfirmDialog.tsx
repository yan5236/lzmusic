import type { ReactElement } from 'react';
import type { CloseBehavior } from '../utils/closeBehavior';
import { LogOut, Minimize2, ShieldQuestion, X } from 'lucide-react';

type CloseActionOption = Exclude<CloseBehavior, 'ask'>;

interface CloseConfirmDialogProps {
  open: boolean;
  selectedOption: CloseActionOption;
  rememberChoice: boolean;
  onSelectOption: (option: CloseActionOption) => void;
  onRememberChange: (remember: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const optionMeta: Record<CloseActionOption, { title: string; description: string; icon: ReactElement }> = {
  exit: {
    title: '直接退出',
    description: '立即退出应用并结束后台播放',
    icon: <LogOut size={18} />,
  },
  minimize: {
    title: '最小化到托盘',
    description: '隐藏窗口，继续在后台播放，可通过托盘恢复',
    icon: <Minimize2 size={18} />,
  },
};

export function CloseConfirmDialog({
  open,
  selectedOption,
  rememberChoice,
  onSelectOption,
  onRememberChange,
  onConfirm,
  onCancel,
}: CloseConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldQuestion size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">关闭应用</h3>
              <p className="text-xs text-slate-500">选择关闭时的行为</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="关闭对话框"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.keys(optionMeta) as CloseActionOption[]).map((option) => {
              const meta = optionMeta[option];
              const isActive = selectedOption === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSelectOption(option)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {meta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>
                          {meta.title}
                        </span>
                        {isActive && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                            已选择
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              checked={rememberChoice}
              onChange={(event) => onRememberChange(event.target.checked)}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-800">记住我的选择，不再询问</span>
              <span className="text-xs text-slate-500">可在设置中重新修改关闭行为</span>
            </div>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

export type { CloseActionOption };
