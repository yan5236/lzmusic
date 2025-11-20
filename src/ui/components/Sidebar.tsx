import React, { useState } from 'react';
import { Home, Search, Library, Folder, Settings, Disc3, PanelLeftClose, PanelLeftOpen, History } from 'lucide-react';
import { ViewState } from '../types';
import type { SidebarItem } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems: SidebarItem[] = [
    { id: ViewState.HOME, label: '首页', icon: <Home size={20} /> },
    { id: ViewState.SEARCH, label: '搜索', icon: <Search size={20} /> },
    { id: ViewState.PLAYLISTS, label: '歌单', icon: <Library size={20} /> },
    { id: ViewState.HISTORY, label: '历史播放', icon: <History size={20} /> },
    { id: ViewState.LOCAL, label: '本地歌曲', icon: <Folder size={20} /> },
    { id: ViewState.SETTINGS, label: '设置', icon: <Settings size={20} /> },
  ];

  return (
    <div
      className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-white border-r border-slate-200 flex flex-col flex-shrink-0 shadow-sm z-10 transition-all duration-300 ease-in-out relative`}
    >
      <div className={`p-6 flex items-center text-primary ${isCollapsed ? 'justify-center px-2 flex-col gap-3' : 'justify-between'}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <Disc3 size={32} className="animate-spin-slow flex-shrink-0" />
          <h1 className={`text-2xl font-bold tracking-wider text-slate-800 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            lzmusic
          </h1>
        </div>
        {/* 折叠按钮移到标题右边 */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary transition-colors flex-shrink-0"
          title={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <div className="flex-1 px-3 py-2 overflow-hidden">
        <div className="space-y-2">
          <p className={`px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100'}`}>
            菜单
          </p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'} py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap group relative ${
                currentView === item.id
                  ? 'bg-blue-50 text-primary shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
