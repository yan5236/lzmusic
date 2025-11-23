/**
 * PlaylistsView 组件 - 歌单列表视图
 * 显示所有歌单，支持创建、查看歌单
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Plus, ListMusic, Music } from 'lucide-react';
import type { Playlist } from '../types';
import CreatePlaylistDialog from '../components/CreatePlaylistDialog';
import { subscribePlaylistEvent } from '../utils/playlistEvents';

interface PlaylistsViewProps {
  onNavigateToDetail: (playlistId: string) => void;
  onShowToast: (message: string) => void;
}

// 使用 memo 包裹组件，避免父组件因播放状态更新导致的频繁重渲染
const PlaylistsView = memo(function PlaylistsView({
  onNavigateToDetail,
  onShowToast,
}: PlaylistsViewProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 使用 ref 存储回调函数
  const onShowToastRef = useRef(onShowToast);
  const onNavigateToDetailRef = useRef(onNavigateToDetail);

  // 保持 ref 最新
  useEffect(() => {
    onShowToastRef.current = onShowToast;
    onNavigateToDetailRef.current = onNavigateToDetail;
  });

  // 加载歌单列表
  const loadPlaylists = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.invoke('app-db-playlist-get-all');
      if (result.success) {
        setPlaylists(result.data);
      } else {
        onShowToastRef.current('加载歌单失败');
      }
    } catch (error) {
      console.error('加载歌单失败:', error);
      onShowToastRef.current('加载歌单失败');
    } finally {
      setIsLoading(false);
    }
  }, []); // 不依赖任何外部变量

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  // 监听歌单更新事件，自动刷新列表
  useEffect(() => {
    const unsubscribe = subscribePlaylistEvent('playlist-updated', () => {
      loadPlaylists();
    });

    return () => {
      unsubscribe();
    };
  }, [loadPlaylists]);

  const handleCreatePlaylist = async (name: string, description?: string) => {
    try {
      const result = await window.electron.invoke(
        'app-db-playlist-create',
        name,
        description
      );
      if (result.success && result.id) {
        onShowToastRef.current('歌单创建成功');
        await loadPlaylists();
        // 自动跳转到新创建的歌单
        onNavigateToDetailRef.current(result.id);
      } else {
        onShowToastRef.current('创建歌单失败');
      }
    } catch (error) {
      console.error('创建歌单失败:', error);
      onShowToastRef.current('创建歌单失败');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-slate-50">
        {/* 顶部标题栏 */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl text-primary">
                <ListMusic size={24} />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">我的歌单</h1>
              <span className="text-slate-500 ml-2">{playlists.length} 个歌单</span>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span className="font-medium">新建歌单</span>
            </button>
          </div>
        </div>

        {/* 歌单网格 */}
        <div className="flex-1 overflow-y-auto p-8">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ListMusic size={64} className="mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">暂无歌单</h3>
              <p className="text-sm mb-6">创建你的第一个歌单，开始收藏喜欢的音乐吧</p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              >
                <Plus size={20} />
                <span>新建歌单</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => onNavigateToDetailRef.current(playlist.id)}
                  className="group text-left"
                >
                  {/* 歌单封面 */}
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-200 shadow-md hover:shadow-xl transition-all mb-3 relative">
                    {playlist.coverUrl ? (
                      <img
                        src={playlist.coverUrl}
                        alt={playlist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                        <Music size={48} className="text-slate-400" />
                      </div>
                    )}
                    {/* 悬停时显示播放按钮 */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
                        <Music size={24} className="text-slate-700" />
                      </div>
                    </div>
                  </div>

                  {/* 歌单信息 */}
                  <div>
                    <h3 className="font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                      {playlist.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {playlist.songCount} 首歌曲
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
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
});

export default PlaylistsView;
