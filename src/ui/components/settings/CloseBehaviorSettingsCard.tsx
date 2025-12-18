import { useEffect, useState, type ReactElement } from 'react';
import { AlertTriangle, LogOut, Minimize2, RefreshCcw } from 'lucide-react';
import type { CloseBehavior } from '../../utils/closeBehavior';
import { getCloseBehaviorPreference, setCloseBehaviorPreference } from '../../utils/closeBehavior';

interface CloseBehaviorSettingsCardProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type CloseBehaviorOption = {
  value: CloseBehavior;
  title: string;
  description: string;
  icon: ReactElement;
};

const options: CloseBehaviorOption[] = [
  {
    value: 'ask',
    title: '每次询问',
    description: '点击关闭时弹出确认，避免误操作',
    icon: <AlertTriangle size={18} />,
  },
  {
    value: 'minimize',
    title: '最小化到托盘',
    description: '关闭按钮隐藏窗口，继续后台播放',
    icon: <Minimize2 size={18} />,
  },
  {
    value: 'exit',
    title: '直接退出',
    description: '点击关闭立即退出并结束播放',
    icon: <LogOut size={18} />,
  },
];

const CloseBehaviorSettingsCard = ({ onShowToast }: CloseBehaviorSettingsCardProps) => {
  const [preference, setPreference] = useState<CloseBehavior>('ask');

  useEffect(() => {
    setPreference(getCloseBehaviorPreference());
  }, []);

  const handleSelect = (value: CloseBehavior) => {
    setPreference(value);
    setCloseBehaviorPreference(value);
    onShowToast('关闭行为已更新', 'success');
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">关闭行为</h2>
          <p className="text-sm text-slate-500 mt-1">选择点击关闭按钮时应用的处理方式</p>
        </div>
        <button
          type="button"
          onClick={() => handleSelect('ask')}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
          title="恢复为每次询问"
        >
          <RefreshCcw size={14} />
          重置询问
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map((option) => {
          const isActive = option.value === preference;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`rounded-xl border-2 p-4 text-left transition-all h-full ${
                isActive
                  ? 'border-primary bg-blue-50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {option.icon}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-slate-900'}`}>
                    {option.title}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">{option.description}</span>
                </div>
              </div>
              {isActive && (
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  当前选中
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CloseBehaviorSettingsCard;
