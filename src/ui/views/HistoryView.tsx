import { useState } from 'react';
import { Play, History, Trash2, X, Music } from 'lucide-react';
import type { Song, PlayerState } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * HistoryView 组件 - 历史播放视图
 * 展示用户的播放历史记录，支持清除全部和删除单条记录
 */

interface HistoryViewProps {
  playerState: PlayerState;
  playSong: (song: Song) => void;
  onClearHistory: () => void; // 清除全部历史记录
  onDeleteHistory: (songId: string) => void; // 删除单条历史记录
  onShowToast: (message: string) => void; // 显示提示
}

export default function HistoryView({
  playerState,
  playSong,
  onClearHistory,
  onDeleteHistory,
  onShowToast
}: HistoryViewProps) {
  // 清除全部确认对话框状态
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /**
   * 处理清除全部历史记录
   */
  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  /**
   * 确认清除全部历史记录
   */
  const confirmClearAll = async () => {
    try {
      const result = await window.electron.invoke('app-db-history-clear');
      if (result.success) {
        onClearHistory();
        onShowToast('已清除全部历史记录');
      } else {
        onShowToast('清除失败');
      }
    } catch (error) {
      console.error('清除历史记录失败:', error);
      onShowToast('清除失败');
    }
    setShowClearConfirm(false);
  };

  /**
   * 处理删除单条历史记录
   */
  const handleDeleteOne = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，避免触发播放
    try {
      const result = await window.electron.invoke('app-db-history-delete', song.id);
      if (result.success) {
        onDeleteHistory(song.id);
        onShowToast('已删除');
      } else {
        onShowToast('删除失败');
      }
    } catch (error) {
      console.error('删除历史记录失败:', error);
      onShowToast('删除失败');
    }
  };

  return (
    <div className="p-8">
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <History size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">历史播放</h1>
        </div>

        {/* 清除全部按钮 - 仅在有历史记录时显示 */}
        {playerState.history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            <span>清除全部</span>
          </button>
        )}
      </div>

      {/* 历史播放列表 */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
          <div className="w-10 text-center">#</div>
          <div>标题</div>
          <div>歌手</div>
          <div className="w-16 text-center">时长</div>
          <div className="w-16 text-center">操作</div>
        </div>
        {playerState.history.length > 0 ? playerState.history.map((song, i) => (
          <div
            key={`history-${song.id}-${i}`}
            className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors"
            onClick={() => playSong(song)}
          >
            <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
              <span className="group-hover:hidden">{i + 1}</span>
              <Play size={14} className="hidden group-hover:inline-block mx-auto" fill="currentColor"/>
            </div>
            <div className="flex items-center gap-3">
              {song.coverUrl ? (
                <img src={song.coverUrl} className="w-10 h-10 rounded shadow-sm object-cover" alt={song.title}/>
              ) : (
                <div className="w-10 h-10 rounded shadow-sm bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <Music size={16} className="text-slate-400" />
                </div>
              )}
              <span className="text-slate-900 font-medium">{song.title}</span>
            </div>
            <div className="text-slate-500 text-sm">{song.artist}</div>
            <div className="w-16 text-center text-slate-400 text-sm font-mono">
              {Math.floor(Math.round(song.duration) / 60)}:{(Math.round(song.duration) % 60).toString().padStart(2, '0')}
            </div>
            {/* 删除按钮 - 参考搜索页面添加歌单按钮样式 */}
            <div className="w-16 text-center">
              <button
                onClick={(e) => handleDeleteOne(song, e)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                title="删除记录"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>
          </div>
        )) : (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <History size={48} className="mb-4 opacity-20"/>
            <p>暂无历史播放记录</p>
          </div>
        )}
      </div>

      {/* 清除全部确认对话框 */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearAll}
        title="清除全部历史记录"
        message="确定要清除所有历史播放记录吗？此操作无法撤销。"
        confirmText="清除"
        cancelText="取消"
        isDanger
      />
    </div>
  );
}
