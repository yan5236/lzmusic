import React, { useCallback, useRef, useState } from 'react';
import { Download, Upload, Check } from 'lucide-react';
import { notifyPlaylistUpdated } from '../../utils/playlistEvents';

interface PlaylistInfo {
  id: string;
  name: string;
  songCount: number;
}

interface PlaylistSettingsSectionProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface ExportDialogProps {
  open: boolean;
  playlists: PlaylistInfo[];
  selectedPlaylists: Set<string>;
  isExporting: boolean;
  isLoading: boolean;
  onClose: () => void;
  onToggle: (playlistId: string) => void;
  onToggleAll: () => void;
  onExport: () => void;
}

interface ImportDialogProps {
  open: boolean;
  playlists: PlaylistInfo[];
  selectedPlaylists: Set<string>;
  isImporting: boolean;
  onClose: () => void;
  onToggle: (playlistId: string) => void;
  onToggleAll: () => void;
  onConfirm: () => void;
}

const usePlaylistTransfer = (onShowToast: PlaylistSettingsSectionProps['onShowToast']) => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [importPlaylists, setImportPlaylists] = useState<PlaylistInfo[]>([]);
  const [importFileContent, setImportFileContent] = useState('');
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPlaylists = useCallback(async () => {
    setIsLoadingPlaylists(true);
    try {
      const result = await window.electron.invoke('app-db-playlist-get-all') as {
        success: boolean;
        data?: PlaylistInfo[];
        error?: string;
      };
      if (result.success && result.data) {
        setPlaylists(result.data);
      }
    } catch (error) {
      console.error('加载歌单列表失败:', error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, []);

  const openExportDialog = useCallback(() => {
    setSelectedPlaylists(new Set());
    setShowExportDialog(true);
    void loadPlaylists();
  }, [loadPlaylists]);

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
      if (prev.size === playlists.length) {
        return new Set();
      }
      return new Set(playlists.map(p => p.id));
    });
  }, [playlists]);

  const handleExport = useCallback(async () => {
    if (selectedPlaylists.size === 0) {
      onShowToast('请先选择要导出的歌单', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const playlistIds = Array.from(selectedPlaylists);
      let exportData: unknown;

      if (playlistIds.length === 1) {
        const result = await window.electron.invoke('app-db-playlist-export', playlistIds[0]) as {
          success: boolean;
          data?: unknown;
          error?: string;
        };
        if (!result.success) {
          throw new Error(result.error || '导出失败');
        }
        exportData = result.data;
      } else {
        const result = await window.electron.invoke('app-db-playlist-export-multiple', playlistIds) as {
          success: boolean;
          data?: unknown;
          error?: string;
        };
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

      onShowToast(`成功导出 ${playlistIds.length} 个歌单`, 'success');
      closeExportDialog();
    } catch (error) {
      console.error('导出歌单失败:', error);
      onShowToast(error instanceof Error ? error.message : '导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [closeExportDialog, onShowToast, selectedPlaylists]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const doImport = useCallback(async (content: string, selectedIds?: string[]) => {
    setIsImporting(true);
    try {
      const result = await window.electron.invoke('app-db-playlist-import', content, selectedIds) as {
        success: boolean;
        imported: number;
        failed: number;
        errors: string[];
      };

      if (result.imported > 0) {
        onShowToast(`成功导入 ${result.imported} 个歌单`, 'success');
        const listResult = await window.electron.invoke('app-db-playlist-get-all') as {
          success: boolean;
          data?: PlaylistInfo[];
        };
        if (listResult.success && listResult.data) {
          setPlaylists(listResult.data);
        }
        notifyPlaylistUpdated();
      }

      if (result.failed > 0) {
        onShowToast(`${result.failed} 个歌单导入失败`, 'error');
        console.error('导入失败详情:', result.errors);
      }

      if (result.imported === 0 && result.failed === 0) {
        onShowToast('未找到可导入的歌单数据', 'error');
      }
    } catch (error) {
      console.error('导入歌单失败:', error);
      onShowToast('导入失败，请检查文件格式', 'error');
    } finally {
      setIsImporting(false);
    }
  }, [onShowToast]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const previewResult = await window.electron.invoke('app-db-playlist-preview-import', text) as {
        success: boolean;
        playlists: PlaylistInfo[];
        isMultiple: boolean;
        error?: string;
      };

      if (!previewResult.success) {
        onShowToast(previewResult.error || '文件格式无效', 'error');
        return;
      }

      if (previewResult.playlists.length === 0) {
        onShowToast('未找到可导入的歌单数据', 'error');
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
      onShowToast('读取文件失败', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [doImport, onShowToast]);

  const closeImportDialog = useCallback(() => {
    setShowImportDialog(false);
    setImportPlaylists([]);
    setImportFileContent('');
    setSelectedPlaylists(new Set());
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (selectedPlaylists.size === 0) {
      onShowToast('请先选择要导入的歌单', 'error');
      return;
    }

    await doImport(importFileContent, Array.from(selectedPlaylists));
    closeImportDialog();
  }, [closeImportDialog, doImport, importFileContent, onShowToast, selectedPlaylists]);

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

  return {
    playlists,
    importPlaylists,
    selectedPlaylists,
    showExportDialog,
    showImportDialog,
    isExporting,
    isImporting,
    isLoadingPlaylists,
    fileInputRef,
    openExportDialog,
    closeExportDialog,
    togglePlaylistSelection,
    toggleSelectAll,
    handleExport,
    handleImportClick,
    handleFileChange,
    closeImportDialog,
    handleConfirmImport,
    toggleImportPlaylistSelection,
    toggleImportSelectAll,
  };
};

const ExportPlaylistsDialog: React.FC<ExportDialogProps> = ({
  open,
  playlists,
  selectedPlaylists,
  isExporting,
  isLoading,
  onClose,
  onToggle,
  onToggleAll,
  onExport,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">选择要导出的歌单</h3>
        </div>

        <div className="px-6 py-4">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">加载中...</div>
          ) : playlists.length === 0 ? (
            <div className="py-8 text-center text-slate-400">暂无歌单</div>
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <button onClick={onToggleAll} className="text-sm text-primary hover:underline">
                  {selectedPlaylists.size === playlists.length ? '取消全选' : '全选'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                {playlists.map(playlist => (
                  <label
                    key={playlist.id}
                    className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    onClick={() => onToggle(playlist.id)}
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
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onExport}
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

const ImportPlaylistsDialog: React.FC<ImportDialogProps> = ({
  open,
  playlists,
  selectedPlaylists,
  isImporting,
  onClose,
  onToggle,
  onToggleAll,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">选择要导入的歌单</h3>
          <p className="text-sm text-slate-500 mt-1">文件中包含 {playlists.length} 个歌单</p>
        </div>

        <div className="px-6 py-4">
          <div className="flex justify-end mb-3">
            <button onClick={onToggleAll} className="text-sm text-primary hover:underline">
              {selectedPlaylists.size === playlists.length ? '取消全选' : '全选'}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
            {playlists.map(playlist => (
              <label
                key={playlist.id}
                className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                onClick={() => onToggle(playlist.id)}
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
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
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

const PlaylistSettingsSection: React.FC<PlaylistSettingsSectionProps> = ({ onShowToast }) => {
  const playlistTransfer = usePlaylistTransfer(onShowToast);

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">歌单管理</h2>
        <p className="text-sm text-slate-500 mb-6">导出歌单到JSON文件，或从JSON文件导入歌单</p>

        <div className="flex gap-4">
          <button
            onClick={playlistTransfer.openExportDialog}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors bg-primary text-white hover:bg-primary/90"
          >
            <Download size={18} />
            导出歌单
          </button>

          <input
            ref={playlistTransfer.fileInputRef}
            type="file"
            accept=".json"
            onChange={playlistTransfer.handleFileChange}
            className="hidden"
          />

          <button
            onClick={playlistTransfer.handleImportClick}
            disabled={playlistTransfer.isImporting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              !playlistTransfer.isImporting
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Upload size={18} />
            {playlistTransfer.isImporting ? '导入中...' : '导入歌单'}
          </button>
        </div>
      </div>

      <ExportPlaylistsDialog
        open={playlistTransfer.showExportDialog}
        playlists={playlistTransfer.playlists}
        selectedPlaylists={playlistTransfer.selectedPlaylists}
        isExporting={playlistTransfer.isExporting}
        isLoading={playlistTransfer.isLoadingPlaylists}
        onClose={playlistTransfer.closeExportDialog}
        onToggle={playlistTransfer.togglePlaylistSelection}
        onToggleAll={playlistTransfer.toggleSelectAll}
        onExport={playlistTransfer.handleExport}
      />

      <ImportPlaylistsDialog
        open={playlistTransfer.showImportDialog}
        playlists={playlistTransfer.importPlaylists}
        selectedPlaylists={playlistTransfer.selectedPlaylists}
        isImporting={playlistTransfer.isImporting}
        onClose={playlistTransfer.closeImportDialog}
        onToggle={playlistTransfer.toggleImportPlaylistSelection}
        onToggleAll={playlistTransfer.toggleImportSelectAll}
        onConfirm={playlistTransfer.handleConfirmImport}
      />
    </>
  );
};

export default PlaylistSettingsSection;
