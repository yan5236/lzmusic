import { Play, Edit2, Trash2 } from 'lucide-react';

/**
 * 歌单详情页的操作按钮组件（播放、编辑、删除）
 */

interface PlaylistActionsProps {
  songCount: number;
  isEditMode: boolean;
  onPlayAll: () => void;
  onEditModeToggle: () => void;
  onDeletePlaylist: () => void;
}

export default function PlaylistActions({
  songCount,
  isEditMode,
  onPlayAll,
  onEditModeToggle,
  onDeletePlaylist,
}: PlaylistActionsProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onPlayAll}
        disabled={songCount === 0}
        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm"
      >
        <Play size={20} />
        <span className="font-medium">播放全部</span>
      </button>

      <button
        onClick={onEditModeToggle}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-primary text-primary rounded-full hover:bg-primary/5 transition-colors"
      >
        <Edit2 size={18} />
        <span>{isEditMode ? '完成' : '编辑'}</span>
      </button>

      <button
        onClick={onDeletePlaylist}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-red-300 text-red-600 rounded-full hover:bg-red-50 transition-colors"
      >
        <Trash2 size={18} />
        <span>删除歌单</span>
      </button>
    </div>
  );
}
