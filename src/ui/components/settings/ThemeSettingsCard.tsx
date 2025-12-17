import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Palette, Sparkles } from 'lucide-react';
import { DEFAULT_THEME_COLOR, normalizeThemeColor } from '../../utils/theme';

interface ThemeSettingsCardProps {
  themeColor: string;
  onThemeColorChange: (color: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const presetColors: { label: string; value: string; description: string }[] = [
  { label: '默认蓝', value: '#2563eb', description: '平衡且通用的主色' },
  { label: '湖水绿', value: '#10b981', description: '清爽柔和，偏自然' },
  { label: '暮光紫', value: '#8b5cf6', description: '沉稳又带一点未来感' },
  { label: '琥珀橙', value: '#f97316', description: '温暖活力，醒目不刺眼' },
  { label: '石墨灰', value: '#475569', description: '低饱和中性色，耐看' },
  { label: '莓果粉', value: '#ec4899', description: '轻盈明快，富有活力' },
];

const INVALID_COLOR_MESSAGE = '请输入有效的十六进制颜色值，例如 #2563eb';

const ThemeSettingsCard: React.FC<ThemeSettingsCardProps> = ({
  themeColor,
  onThemeColorChange,
  onShowToast,
}) => {
  const [customInput, setCustomInput] = useState(themeColor);

  useEffect(() => {
    setCustomInput(themeColor);
  }, [themeColor]);

  const normalizedActiveColor = useMemo(
    () => normalizeThemeColor(themeColor) || DEFAULT_THEME_COLOR,
    [themeColor]
  );

  const normalizedCustomColor = useMemo(
    () => normalizeThemeColor(customInput),
    [customInput]
  );

  const safePickerValue = useMemo(() => {
    if (normalizedCustomColor && normalizedCustomColor.length === 7) return normalizedCustomColor;
    if (normalizedActiveColor.length === 7) return normalizedActiveColor;
    return DEFAULT_THEME_COLOR;
  }, [normalizedActiveColor, normalizedCustomColor]);

  const handleSelectColor = useCallback(
    (color: string, options?: { silent?: boolean }) => {
      const normalized = normalizeThemeColor(color);
      if (!normalized) {
        if (!options?.silent) {
          onShowToast(INVALID_COLOR_MESSAGE, 'error');
        }
        return;
      }

      if (normalized === normalizedActiveColor) {
        if (!options?.silent) {
          onShowToast('当前已是该主题色', 'info');
        }
        return;
      }

      onThemeColorChange(normalized);
      setCustomInput(normalized);
      if (!options?.silent) {
        onShowToast('主题色已更新', 'success');
      }
    },
    [normalizedActiveColor, onShowToast, onThemeColorChange]
  );

  const handleApplyCustom = useCallback(() => {
    handleSelectColor(customInput);
  }, [customInput, handleSelectColor]);

  const handleReset = useCallback(() => {
    handleSelectColor(DEFAULT_THEME_COLOR);
  }, [handleSelectColor]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-primary border border-blue-100">
            <Palette size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">主题设置</h2>
            <p className="text-sm text-slate-500">选择或自定义主题色，让界面更符合你的喜好</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl border border-slate-200 shadow-inner"
            style={{ backgroundColor: normalizedActiveColor }}
          />
          <div className="text-right">
            <div className="text-xs text-slate-500">当前主题色</div>
            <div className="text-sm font-mono text-slate-800">{normalizedActiveColor.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {presetColors.map((color) => {
          const isActive = normalizeThemeColor(color.value) === normalizedActiveColor;
          return (
            <button
              key={color.value}
              onClick={() => handleSelectColor(color.value)}
              className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div
                  className="w-11 h-11 rounded-lg border border-slate-200 shadow-sm"
                  style={{ backgroundColor: color.value }}
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">{color.label}</div>
                  <div className="text-xs text-slate-500 font-mono">{color.value.toUpperCase()}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{color.description}</div>
                </div>
              </div>
              {isActive && (
                <div className="flex items-center gap-1 text-primary text-sm font-medium">
                  <Check size={16} />
                  使用中
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600">
              <Sparkles size={18} />
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-semibold text-slate-800">自定义颜色</span>
              <span className="text-xs text-slate-500">
                输入十六进制色值或使用取色器，立即预览并应用
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center">
              <input
                type="color"
                value={safePickerValue}
                onChange={(event) => handleSelectColor(event.target.value, { silent: true })}
                className="w-11 h-11 rounded-lg border border-slate-200 bg-white cursor-pointer"
                aria-label="选择主题色"
              />
            </label>
            <input
              type="text"
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              placeholder="#2563eb"
              className="flex-1 min-w-[200px] h-11 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleApplyCustom}
              className={`h-11 px-4 text-sm rounded-lg font-medium transition-colors shrink-0 ${
                normalizedCustomColor && normalizedCustomColor !== normalizedActiveColor
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
              disabled={!normalizedCustomColor || normalizedCustomColor === normalizedActiveColor}
            >
              应用
            </button>
            <button
              onClick={handleReset}
              className={`h-11 px-4 text-sm rounded-lg font-medium transition-colors border shrink-0 ${
                normalizedActiveColor !== DEFAULT_THEME_COLOR
                  ? 'border-slate-200 text-slate-700 hover:bg-white'
                  : 'border-slate-100 text-slate-400 cursor-not-allowed bg-slate-100'
              }`}
              disabled={normalizedActiveColor === DEFAULT_THEME_COLOR}
            >
              恢复默认
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          支持 3 或 6 位的十六进制颜色，例如 #2563eb、#0ea5e9。颜色会立即应用到按钮、链接等主色元素。
        </p>
      </div>
    </div>
  );
};

export default ThemeSettingsCard;
