import { useCallback, type ReactElement } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../../utils/themeMode';

interface DarkModeSettingsCardProps {
  themeMode: ThemeMode;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
  onThemeModeChange: (mode: ThemeMode) => void;
}

type ThemeModeOption = {
  value: ThemeMode;
  title: string;
  description: string;
  icon: ReactElement;
};

const options: ThemeModeOption[] = [
  {
    value: 'system',
    title: '跟随系统',
    description: '自动根据系统主题切换',
    icon: <Monitor size={18} />,
  },
  {
    value: 'light',
    title: '浅色模式',
    description: '始终保持浅色界面',
    icon: <Sun size={18} />,
  },
  {
    value: 'dark',
    title: '深色模式',
    description: '始终保持深色界面',
    icon: <Moon size={18} />,
  },
];

const DarkModeSettingsCard = ({
  themeMode,
  systemTheme,
  resolvedTheme,
  onThemeModeChange,
}: DarkModeSettingsCardProps) => {
  const systemLabel = systemTheme === 'dark' ? '深色' : '浅色';
  const resolvedLabel = resolvedTheme === 'dark' ? '深色' : '浅色';

  const handleSelect = useCallback(
    (mode: ThemeMode) => {
      onThemeModeChange(mode);
    },
    [onThemeModeChange]
  );

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">深色模式</h2>
          <p className="text-sm text-slate-500 mt-1">可跟随系统或手动指定深浅色</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">系统当前</div>
          <div className="text-sm font-semibold text-slate-800">{systemLabel}模式</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map((option) => {
          const isActive = option.value === themeMode;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              aria-pressed={isActive}
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

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">当前生效</div>
          <div className="text-xs text-slate-500 mt-1">
            {themeMode === 'system' ? `跟随系统（${systemLabel}）` : '已手动选择主题'}
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            resolvedTheme === 'dark'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
          aria-live="polite"
        >
          {resolvedLabel}模式
        </span>
      </div>
    </div>
  );
};

export default DarkModeSettingsCard;
