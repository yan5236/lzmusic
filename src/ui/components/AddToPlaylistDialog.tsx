/**
 * 添加到歌单对话框组件
 * 显示所有歌单，允许用户选择要添加歌曲的歌单
 */

import { useState, useEffect } from 'react';
import { ListMusic, Plus } from 'lucide-react';
import type { Playlist, Song } from '../types';
import CreatePlaylistDialog from './CreatePlaylistDialog';

interface AddToPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  onAddToPlaylist: (playlistId: string) => void;
  onCreatePlaylist: (name: string, description?: string) => Promise<string>; // 返回新创建的歌单ID
}

export default function AddToPlaylistDialog({
  isOpen,
  onClose,
  song,
  onAddToPlaylist,
  onCreatePlaylist,
}: AddToPlaylistDialogProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 加载歌单列表
  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.invoke('app-db-playlist-get-all');
      if (result.success) {
        setPlaylists(result.data);
      }
    } catch (error) {
      console.error('加载歌单列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlaylist = (playlistId: string) => {
    onAddToPlaylist(playlistId);
    onClose();
  };

  const handleCreatePlaylist = async (name: string, description?: string) => {
    try {
      const playlistId = await onCreatePlaylist(name, description);
      setShowCreateDialog(false);
      // 重新加载歌单列表
      await loadPlaylists();
      // 直接添加到新创建的歌单
      handleSelectPlaylist(playlistId);
    } catch (error) {
      console.error('创建歌单失败:', error);
    }
  };

  if (!isOpen || !song) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[70vh] flex flex-col">
          {/* 标题栏 */}
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">添加到歌单</h2>
            <p className="text-sm text-slate-500 mt-1 truncate">
              {song.title} - {song.artist}
            </p>
          </div>

          {/* 新建歌单按钮 */}
          <div className="px-6 py-3 border-b border-slate-100">
            <button
              onClick={() => setShowCreateDialog(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium">新建歌单</span>
            </button>
          </div>

          {/* 歌单列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-slate-400">加载中...</div>
              </div>
            ) : playlists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <ListMusic size={48} className="mb-2 opacity-50" />
                <p>暂无歌单</p>
                <p className="text-sm mt-1">点击上方按钮创建新歌单</p>
              </div>
            ) : (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleSelectPlaylist(playlist.id)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {/* 封面或图标 */}
                      <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {playlist.coverUrl ? (
                          <img
                            src={playlist.coverUrl}
                            alt={playlist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ListMusic size={24} className="text-slate-400" />
                        )}
                      </div>

                      {/* 歌单信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-800 font-medium truncate">
                          {playlist.name}
                        </div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          {playlist.songCount} 首歌曲
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      {/* 新建歌单对话框 */}
      <CreatePlaylistDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreatePlaylist}
      />
    </>
  );
}
