import React, { useState , useRef } from 'react';
import { Disc, Image, Download, Upload, Check } from 'lucide-react';
import { notifyPlaylistUpdated } from '../utils/playlistEvents';

/**
 * 歌单数据结构（用于显示选择列表）
 */
interface PlaylistInfo {
  id: string;
  name: string;
  songCount: number;
}

/**
 * 设置页面属性接口
 */
interface SettingsViewProps {
  coverStyle: 'normal' | 'vinyl';
  onCoverStyleChange: (style: 'normal' | 'vinyl') => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * 设置页面组件
 * 提供播放样式、歌单导出导入等设置选项
 */
const SettingsView: React.FC<SettingsViewProps> = ({
  coverStyle,
  onCoverStyleChange,
  onShowToast,
}) => {
  // 导出对话框状态
  const [showExportDialog, setShowExportDialog] = useState(false);
  // 导入对话框状态
  const [showImportDialog, setShowImportDialog] = useState(false);
  // 歌单列表状态（仅在对话框中使用）
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  // 待导入的歌单列表（从文件解析）
  const [importPlaylists, setImportPlaylists] = useState<PlaylistInfo[]>([]);
  // 待导入的文件内容
  const [importFileContent, setImportFileContent] = useState<string>('');
  // 选中的歌单ID列表（用于导出和导入）
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  // 加载状态
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  // 文件输入ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 加载歌单列表（打开对话框时调用）
   */
  const loadPlaylists = async () => {
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
  };

  /**
   * 打开导出对话框
   */
  const openExportDialog = () => {
    setSelectedPlaylists(new Set());
    setShowExportDialog(true);
    loadPlaylists();
  };

  /**
   * 关闭导出对话框
   */
  const closeExportDialog = () => {
    setShowExportDialog(false);
    setSelectedPlaylists(new Set());
  };

  /**
   * 切换歌单选中状态
   */
  const togglePlaylistSelection = (playlistId: string) => {
    setSelectedPlaylists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (selectedPlaylists.size === playlists.length) {
      setSelectedPlaylists(new Set());
    } else {
      setSelectedPlaylists(new Set(playlists.map(p => p.id)));
    }
  };

  /**
   * 导出选中的歌单
   */
  const handleExport = async () => {
    if (selectedPlaylists.size === 0) {
      onShowToast('请先选择要导出的歌单', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const playlistIds = Array.from(selectedPlaylists);

      // 根据选中数量决定导出格式
      let exportData: unknown;
      if (playlistIds.length === 1) {
        // 单个歌单使用旧版格式
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
        // 多个歌单使用新版格式
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

      // 创建下载链接
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `LZMusic_playlists_${timestamp}.json`;

      // 触发下载
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
  };

  /**
   * 触发文件选择
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * 处理文件选择（预览文件内容）
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      // 预览文件中的歌单列表
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

      // 如果只有一个歌单，直接导入
      if (previewResult.playlists.length === 1) {
        await doImport(text);
      } else {
        // 多个歌单，显示选择对话框
        setImportFileContent(text);
        setImportPlaylists(previewResult.playlists);
        setSelectedPlaylists(new Set(previewResult.playlists.map(p => p.id)));
        setShowImportDialog(true);
      }
    } catch (error) {
      console.error('读取文件失败:', error);
      onShowToast('读取文件失败', 'error');
    } finally {
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * 关闭导入对话框
   */
  const closeImportDialog = () => {
    setShowImportDialog(false);
    setImportPlaylists([]);
    setImportFileContent('');
    setSelectedPlaylists(new Set());
  };

  /**
   * 执行导入操作
   */
  const doImport = async (content: string, selectedIds?: string[]) => {
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
        // 刷新歌单列表
        const listResult = await window.electron.invoke('app-db-playlist-get-all') as {
          success: boolean;
          data?: PlaylistInfo[];
        };
        if (listResult.success && listResult.data) {
          setPlaylists(listResult.data);
        }
        // 通知其他视图刷新
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
  };

  /**
   * 从对话框确认导入选中的歌单
   */
  const handleConfirmImport = async () => {
    if (selectedPlaylists.size === 0) {
      onShowToast('请先选择要导入的歌单', 'error');
      return;
    }

    await doImport(importFileContent, Array.from(selectedPlaylists));
    closeImportDialog();
  };

  /**
   * 切换导入歌单选中状态
   */
  const toggleImportPlaylistSelection = (playlistId: string) => {
    setSelectedPlaylists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  /**
   * 导入对话框全选/取消全选
   */
  const toggleImportSelectAll = () => {
    if (selectedPlaylists.size === importPlaylists.length) {
      setSelectedPlaylists(new Set());
    } else {
      setSelectedPlaylists(new Set(importPlaylists.map(p => p.id)));
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      {/* 页面标题 */}
      <h1 className="text-3xl font-bold text-slate-900 mb-8">设置</h1>

      {/* 设置分组 */}
      <div className="space-y-6">
        {/* 播放样式设置卡片 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">播放样式</h2>
          <p className="text-sm text-slate-500 mb-6">选择播放界面的封面显示样式</p>

          {/* 样式选项 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 普通样式选项 */}
            <button
              onClick={() => onCoverStyleChange('normal')}
              className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
                coverStyle === 'normal'
                  ? 'border-primary bg-blue-50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-3 ${
                coverStyle === 'normal' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
              }`}>
                <Image size={32} />
              </div>
              <span className={`text-sm font-medium ${
                coverStyle === 'normal' ? 'text-primary' : 'text-slate-700'
              }`}>
                普通
              </span>
              <span className="text-xs text-slate-400 mt-1">方形封面</span>
            </button>

            {/* 黑胶唱片样式选项 */}
            <button
              onClick={() => onCoverStyleChange('vinyl')}
              className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
                coverStyle === 'vinyl'
                  ? 'border-primary bg-blue-50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-3 ${
                coverStyle === 'vinyl' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
              }`}>
                <Disc size={32} />
              </div>
              <span className={`text-sm font-medium ${
                coverStyle === 'vinyl' ? 'text-primary' : 'text-slate-700'
              }`}>
                黑胶唱片
              </span>
              <span className="text-xs text-slate-400 mt-1">旋转唱片效果</span>
            </button>
          </div>
        </div>

        {/* 歌单导出导入设置卡片 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">歌单管理</h2>
          <p className="text-sm text-slate-500 mb-6">导出歌单到JSON文件，或从JSON文件导入歌单</p>

          {/* 导出导入按钮区域 */}
          <div className="flex gap-4">
            {/* 导出按钮 */}
            <button
              onClick={openExportDialog}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors bg-primary text-white hover:bg-primary/90"
            >
              <Download size={18} />
              导出歌单
            </button>

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* 导入按钮 */}
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                !isImporting
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Upload size={18} />
              {isImporting ? '导入中...' : '导入歌单'}
            </button>
          </div>
        </div>

        {/* 导出歌单对话框 */}
        {showExportDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl">
              {/* 对话框头部 */}
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">选择要导出的歌单</h3>
              </div>

              {/* 对话框内容 */}
              <div className="px-6 py-4">
                {isLoadingPlaylists ? (
                  <div className="py-8 text-center text-slate-400">加载中...</div>
                ) : playlists.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">暂无歌单</div>
                ) : (
                  <>
                    {/* 全选按钮 */}
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={toggleSelectAll}
                        className="text-sm text-primary hover:underline"
                      >
                        {selectedPlaylists.size === playlists.length ? '取消全选' : '全选'}
                      </button>
                    </div>

                    {/* 歌单选择列表 */}
                    <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                      {playlists.map(playlist => (
                        <label
                          key={playlist.id}
                          className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                          onClick={() => togglePlaylistSelection(playlist.id)}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                              selectedPlaylists.has(playlist.id)
                                ? 'bg-primary border-primary'
                                : 'border-slate-300'
                            }`}
                          >
                            {selectedPlaylists.has(playlist.id) && (
                              <Check size={14} className="text-white" />
                            )}
                          </div>
                          <span className="flex-1 text-sm text-slate-700">{playlist.name}</span>
                          <span className="text-xs text-slate-400">{playlist.songCount} 首</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 对话框底部按钮 */}
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
        )}

        {/* 导入歌单选择对话框 */}
        {showImportDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl">
              {/* 对话框头部 */}
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">选择要导入的歌单</h3>
                <p className="text-sm text-slate-500 mt-1">
                  文件中包含 {importPlaylists.length} 个歌单
                </p>
              </div>

              {/* 对话框内容 */}
              <div className="px-6 py-4">
                {/* 全选按钮 */}
                <div className="flex justify-end mb-3">
                  <button
                    onClick={toggleImportSelectAll}
                    className="text-sm text-primary hover:underline"
                  >
                    {selectedPlaylists.size === importPlaylists.length ? '取消全选' : '全选'}
                  </button>
                </div>

                {/* 歌单选择列表 */}
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                  {importPlaylists.map(playlist => (
                    <label
                      key={playlist.id}
                      className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                      onClick={() => toggleImportPlaylistSelection(playlist.id)}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                          selectedPlaylists.has(playlist.id)
                            ? 'bg-primary border-primary'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedPlaylists.has(playlist.id) && (
                          <Check size={14} className="text-white" />
                        )}
                      </div>
                      <span className="flex-1 text-sm text-slate-700">{playlist.name}</span>
                      <span className="text-xs text-slate-400">{playlist.songCount} 首</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 对话框底部按钮 */}
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
        )}
      </div>
    </div>
  );
};

export default SettingsView;
