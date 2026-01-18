/**
 * PlaylistsView 组件 - 歌单列表视图
 * 显示所有歌单，支持创建、查看歌单
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Plus, ListMusic, Music, Download, Upload, Check } from 'lucide-react';
import type { Playlist } from '../types';
import CreatePlaylistDialog from '../components/CreatePlaylistDialog';
import { subscribePlaylistEvent } from '../utils/playlistEvents';

interface PlaylistInfo {
  id: string;
  name: string;
  songCount: number;
}

interface PlaylistsViewProps {
  onNavigateToDetail: (playlistId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// 使用 memo 包裹组件，避免父组件因播放状态更新导致的频繁重渲染
const PlaylistsView = memo(function PlaylistsView({
  onNavigateToDetail,
  onShowToast,
}: PlaylistsViewProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exportPlaylists, setExportPlaylists] = useState<PlaylistInfo[]>([]);
  const [importPlaylists, setImportPlaylists] = useState<PlaylistInfo[]>([]);
  const [importFileContent, setImportFileContent] = useState('');
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingExportPlaylists, setIsLoadingExportPlaylists] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadExportPlaylists = useCallback(async () => {
    setIsLoadingExportPlaylists(true);
    try {
      const result = await window.electron.invoke('app-db-playlist-get-all');
      if (result.success) {
        setExportPlaylists(result.data);
      }
    } catch (error) {
      console.error('加载歌单列表失败:', error);
    } finally {
      setIsLoadingExportPlaylists(false);
    }
  }, []);

  const openExportDialog = useCallback(() => {
    setSelectedPlaylists(new Set());
    setShowExportDialog(true);
    void loadExportPlaylists();
  }, [loadExportPlaylists]);

  const closeExportDialog = useCallback(() => {
    setShowExportDialog(false);
    setSelectedPlaylists(new Set());
  }, []);

  const togglePlaylistSelection = useCallback((playlistId: string) => {
    setSelectedPlaylists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedPlaylists(prev => {
      if (prev.size === exportPlaylists.length) {
        return new Set();
      }
      return new Set(exportPlaylists.map(p => p.id));
    });
  }, [exportPlaylists]);

  const handleExport = useCallback(async () => {
    if (selectedPlaylists.size === 0) {
      onShowToastRef.current('请先选择要导出的歌单', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const playlistIds = Array.from(selectedPlaylists);
      let exportData: unknown;

      if (playlistIds.length === 1) {
        const result = await window.electron.invoke('app-db-playlist-export', playlistIds[0]);
        if (!result.success) {
          throw new Error(result.error || '导出失败');
        }
        exportData = result.data;
      } else {
        const result = await window.electron.invoke('app-db-playlist-export-multiple', playlistIds);
        if (!result.success) {
          throw new Error(result.error || '导出失败');
        }
        exportData = result.data;
      }

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `LZMusic_playlists_${timestamp}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowToastRef.current(`成功导出 ${playlistIds.length} 个歌单`, 'success');
      closeExportDialog();
      await loadPlaylists();
    } catch (error) {
      console.error('导出歌单失败:', error);
      onShowToastRef.current(error instanceof Error ? error.message : '导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [closeExportDialog, selectedPlaylists, loadPlaylists]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const doImport = useCallback(async (content: string, selectedIds?: string[]) => {
    setIsImporting(true);
    try {
      const result = await window.electron.invoke('app-db-playlist-import', content, selectedIds);

      if (result.imported > 0) {
        onShowToastRef.current(`成功导入 ${result.imported} 个歌单`, 'success');
        await loadPlaylists();
      }

      if (result.failed > 0) {
        onShowToastRef.current(`${result.failed} 个歌单导入失败`, 'error');
        console.error('导入失败详情:', result.errors);
      }

      if (result.imported === 0 && result.failed === 0) {
        onShowToastRef.current('未找到可导入的歌单数据', 'error');
      }
    } catch (error) {
      console.error('导入歌单失败:', error);
      onShowToastRef.current('导入失败，请检查文件格式', 'error');
    } finally {
      setIsImporting(false);
    }
  }, [loadPlaylists]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const previewResult = await window.electron.invoke('app-db-playlist-preview-import', text);

      if (!previewResult.success) {
        onShowToastRef.current(previewResult.error || '文件格式无效', 'error');
        return;
      }

      if (previewResult.playlists.length === 0) {
        onShowToastRef.current('未找到可导入的歌单数据', 'error');
        return;
      }

      if (previewResult.playlists.length === 1) {
        await doImport(text);
      } else {
        setImportFileContent(text);
        setImportPlaylists(previewResult.playlists);
        setSelectedPlaylists(new Set(previewResult.playlists.map(p => p.id)));
        setShowImportDialog(true);
      }
    } catch (error) {
      console.error('读取文件失败:', error);
      onShowToastRef.current('读取文件失败', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [doImport]);

  const closeImportDialog = useCallback(() => {
    setShowImportDialog(false);
    setImportPlaylists([]);
    setImportFileContent('');
    setSelectedPlaylists(new Set());
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (selectedPlaylists.size === 0) {
      onShowToastRef.current('请先选择要导入的歌单', 'error');
      return;
    }

    await doImport(importFileContent, Array.from(selectedPlaylists));
    closeImportDialog();
  }, [closeImportDialog, doImport, importFileContent, selectedPlaylists]);

  const toggleImportPlaylistSelection = useCallback((playlistId: string) => {
    setSelectedPlaylists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  }, []);

  const toggleImportSelectAll = useCallback(() => {
    setSelectedPlaylists(prev => {
      if (prev.size === importPlaylists.length) {
        return new Set();
      }
      return new Set(importPlaylists.map(p => p.id));
    });
  }, [importPlaylists]);

  const ExportPlaylistsDialog = () => {
    if (!showExportDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">选择要导出的歌单</h3>
          </div>

          <div className="px-6 py-4">
            {isLoadingExportPlaylists ? (
              <div className="py-8 text-center text-slate-400">加载中...</div>
            ) : exportPlaylists.length === 0 ? (
              <div className="py-8 text-center text-slate-400">暂无歌单</div>
            ) : (
              <>
                <div className="flex justify-end mb-3">
                  <button onClick={toggleSelectAll} className="text-sm text-primary hover:underline">
                    {selectedPlaylists.size === exportPlaylists.length ? '取消全选' : '全选'}
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                  {exportPlaylists.map(playlist => (
                    <label
                      key={playlist.id}
                      className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                      onClick={() => togglePlaylistSelection(playlist.id)}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                          selectedPlaylists.has(playlist.id) ? 'bg-primary border-primary' : 'border-slate-300'
                        }`}
                      >
                        {selectedPlaylists.has(playlist.id) && <Check size={14} className="text-white" />}
                      </div>
                      <span className="flex-1 text-sm text-slate-700">{playlist.name}</span>
                      <span className="text-xs text-slate-400">{playlist.songCount} 首</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
            <button
              onClick={closeExportDialog}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedPlaylists.size === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                selectedPlaylists.size > 0 && !isExporting
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Download size={16} />
              {isExporting ? '导出中...' : `导出 (${selectedPlaylists.size})`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ImportPlaylistsDialog = () => {
    if (!showImportDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">选择要导入的歌单</h3>
            <p className="text-sm text-slate-500 mt-1">文件中包含 {importPlaylists.length} 个歌单</p>
          </div>

          <div className="px-6 py-4">
            <div className="flex justify-end mb-3">
              <button onClick={toggleImportSelectAll} className="text-sm text-primary hover:underline">
                {selectedPlaylists.size === importPlaylists.length ? '取消全选' : '全选'}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              {importPlaylists.map(playlist => (
                <label
                  key={playlist.id}
                  className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                  onClick={() => toggleImportPlaylistSelection(playlist.id)}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                      selectedPlaylists.has(playlist.id) ? 'bg-primary border-primary' : 'border-slate-300'
                    }`}
                  >
                    {selectedPlaylists.has(playlist.id) && <Check size={14} className="text-white" />}
                  </div>
                  <span className="flex-1 text-sm text-slate-700">{playlist.name}</span>
                  <span className="text-xs text-slate-400">{playlist.songCount} 首</span>
                </label>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
            <button
              onClick={closeImportDialog}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={isImporting || selectedPlaylists.size === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                selectedPlaylists.size > 0 && !isImporting
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Upload size={16} />
              {isImporting ? '导入中...' : `导入 (${selectedPlaylists.size})`}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <ListMusic size={24} />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">我的歌单</h1>
              <span className="text-slate-500 ml-2">{playlists.length} 个歌单</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus size={20} />
                <span className="font-medium">新建歌单</span>
              </button>
              <button
                onClick={openExportDialog}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors shadow-sm"
              >
                <Download size={20} />
                <span className="font-medium">导出歌单</span>
              </button>
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className={`flex items-center gap-2 px-6 py-3 rounded-full transition-colors shadow-sm ${
                  !isImporting
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Upload size={20} />
                <span className="font-medium">{isImporting ? '导入中...' : '导入歌单'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
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
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
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
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
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
                    <h3 className="font-medium text-slate-800 truncate group-hover:text-primary transition-colors">
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

      {/* 导出歌单对话框 */}
      <ExportPlaylistsDialog />

      {/* 导入歌单对话框 */}
      <ImportPlaylistsDialog />
    </>
  );
});

export default PlaylistsView;
