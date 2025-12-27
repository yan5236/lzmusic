import { Trash2 } from 'lucide-react';

/**
 * 歌单编辑模式下的批量操作工具栏组件
 */

interface EditToolbarProps {
  selectedCount: number;
  totalCount: number;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  onDeleteSelected: () => void;
}

export default function EditToolbar({
  selectedCount,
  totalCount,
  onToggleSelectAll,
  isAllSelected,
  onDeleteSelected,
}: EditToolbarProps) {
  return (
    <div className="px-8 py-3 bg-primary/5 border-t border-primary/20 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isAllSelected && totalCount > 0}
          onChange={onToggleSelectAll}
          className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary"
        />
        <span className="text-slate-700">已选择 {selectedCount} 首歌曲</span>
      </div>

      <button
        onClick={onDeleteSelected}
        disabled={selectedCount === 0}
        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        <Trash2 size={18} />
        <span>删除选中</span>
      </button>
    </div>
  );
}
