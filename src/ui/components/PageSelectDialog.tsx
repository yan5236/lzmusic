/**
 * 分P选择对话框组件
 * 当视频有多个分P时,让用户选择要播放的具体分P
 */

import { useState } from 'react';
import type { BilibiliPage } from '../../shared/types';

interface PageSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pages: BilibiliPage[];
  onSelect: (page: BilibiliPage) => void;
  videoTitle: string;
}

/**
 * 格式化时长(秒转为 "分:秒" 或 "时:分:秒")
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function PageSelectDialog({
  isOpen,
  onClose,
  pages,
  onSelect,
  videoTitle,
}: PageSelectDialogProps) {
  const [selectedPage, setSelectedPage] = useState<BilibiliPage | null>(null);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedPage) {
      onSelect(selectedPage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">选择分P</h2>
          <p className="text-sm text-slate-500 mt-1 truncate">{videoTitle}</p>
        </div>

        {/* 分P列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {pages.map((page) => (
              <button
                key={page.cid}
                onClick={() => setSelectedPage(page)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedPage?.cid === page.cid
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-500">P{page.page}</span>
                      <span className="text-base text-slate-800 truncate">{page.part}</span>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500 flex-shrink-0">
                    {formatDuration(page.duration)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedPage}
            className={`px-6 py-2 rounded-lg transition-colors ${
              selectedPage
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            播放
          </button>
        </div>
      </div>
    </div>
  );
}
