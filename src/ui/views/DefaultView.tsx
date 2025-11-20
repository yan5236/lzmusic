import { Settings } from 'lucide-react';
import type { ViewState } from '../types';

/**
 * DefaultView 组件 - 默认视图
 * 用于显示尚未实现的功能页面
 */

interface DefaultViewProps {
  currentView: ViewState;
}

export default function DefaultView({ currentView }: DefaultViewProps) {
  return (
    <div className="p-8 flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-primary">
        <Settings size={32} />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">施工中</h2>
      <p>该功能 ({currentView}) 正在开发中。</p>
    </div>
  );
}
