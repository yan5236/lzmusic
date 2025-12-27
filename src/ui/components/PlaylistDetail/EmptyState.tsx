import { Music } from 'lucide-react';

/**
 * 歌单为空时的占位展示组件
 */

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <Music size={64} className="mb-4 opacity-50" />
      <p className="text-xl font-medium mb-2">歌单为空</p>
      <p className="text-sm">在搜索页面或播放器中添加歌曲到此歌单</p>
    </div>
  );
}
