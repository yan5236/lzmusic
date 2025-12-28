import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import UpdateDialog from '../UpdateDialog';
import type { UpdateDownloadState, UpdateEventPayload, UpdateInfo, UpdateProgress } from '../../types';

interface UpdateSectionProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const useUpdateManager = (onShowToast: UpdateSectionProps['onShowToast']) => {
  const [appVersion, setAppVersion] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<UpdateInfo | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [ignoredVersion, setIgnoredVersion] = useState<string | null>(() => localStorage.getItem('ignoredVersion'));
  const [downloadState, setDownloadState] = useState<UpdateDownloadState>('idle');
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null);
  const [hasAutoCheckedUpdate, setHasAutoCheckedUpdate] = useState(false);

  const [isDebugMode] = useState(() => import.meta.env.DEV);
  const [debugDownloadState, setDebugDownloadState] = useState<UpdateDownloadState>('idle');
  const [debugDownloadProgress, setDebugDownloadProgress] = useState<UpdateProgress | null>(null);
  const debugDownloadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearDebugDownloadTimer = useCallback(() => {
    if (debugDownloadTimerRef.current) {
      clearInterval(debugDownloadTimerRef.current);
      debugDownloadTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const loadAppVersion = async () => {
      try {
        const result = await window.electron.invoke('app-get-version') as { success: boolean; version: string };
        if (result.success) {
          setAppVersion(result.version);
        }
      } catch (error) {
        console.error('获取应用版本失败:', error);
      }
    };

    void loadAppVersion();
  }, []);

  const handleCheckUpdate = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsCheckingUpdate(true);
    try {
      const result = await window.electron.invoke('app-check-update') as {
        success: boolean;
        error?: string;
        updateAvailable?: boolean;
        updateInfo?: UpdateInfo;
        currentVersion?: string;
      };

      if (result.currentVersion) {
        setAppVersion(result.currentVersion);
      }

      if (!result.success) {
        if (!silent) {
          onShowToast(result.error || '检查更新失败', 'error');
        }
        return;
      }

      if (result.updateAvailable && result.updateInfo) {
        if (ignoredVersion && result.updateInfo.version === ignoredVersion) {
          if (!silent) {
            onShowToast(`已忽略版本 ${ignoredVersion}`, 'info');
          }
          return;
        }
        const sameVersion = pendingUpdate?.version === result.updateInfo.version;
        const keepProgress =
          sameVersion &&
          (downloadState === 'downloading' || downloadState === 'paused' || downloadState === 'completed');
        setPendingUpdate(result.updateInfo as UpdateInfo);
        if (!keepProgress) {
          setDownloadState('idle');
          setDownloadProgress(null);
        }
        setShowUpdateDialog(true);
      } else {
        setPendingUpdate(null);
        setDownloadState('idle');
        setDownloadProgress(null);
        if (!silent) {
          onShowToast('当前已是最新版本', 'success');
        }
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      if (!silent) {
        onShowToast('检查更新失败', 'error');
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [downloadState, ignoredVersion, onShowToast, pendingUpdate]);

  const handleDownloadUpdate = useCallback(async (options?: { resume?: boolean }) => {
    if (!pendingUpdate) return;

    setDownloadState('downloading');
    if (!options?.resume) {
      setDownloadProgress(null);
    }
    try {
      const result = await window.electron.invoke('app-download-update', options || {}) as {
        success: boolean;
        cancelled?: boolean;
        error?: string;
      };
      if (!result.success && !result.cancelled) {
        setDownloadState('error');
        onShowToast(result.error || '下载更新失败', 'error');
      }
    } catch (error) {
      console.error('下载更新失败:', error);
      setDownloadState('error');
      onShowToast('下载更新失败', 'error');
    }
  }, [onShowToast, pendingUpdate]);

  const handlePauseDownload = useCallback(async () => {
    try {
      const result = await window.electron.invoke('app-update-control', 'pause') as {
        success: boolean;
        error?: string;
      };
      if (!result.success) {
        onShowToast(result.error || '暂停下载失败', 'error');
      }
    } catch (error) {
      console.error('暂停下载失败:', error);
      onShowToast('暂停下载失败', 'error');
    }
  }, [onShowToast]);

  const handleResumeDownload = useCallback(() => {
    void handleDownloadUpdate({ resume: true });
  }, [handleDownloadUpdate]);

  const handleCancelDownload = useCallback(async () => {
    if (downloadState === 'paused') {
      setDownloadState('idle');
      setDownloadProgress(null);
      onShowToast('已取消下载', 'info');
      return;
    }

    try {
      const result = await window.electron.invoke('app-update-control', 'cancel') as {
        success: boolean;
        error?: string;
      };
      if (!result.success) {
        onShowToast(result.error || '取消下载失败', 'error');
        return;
      }
      setDownloadState('idle');
      setDownloadProgress(null);
      onShowToast('已取消下载', 'info');
    } catch (error) {
      console.error('取消下载失败:', error);
      onShowToast('取消下载失败', 'error');
    }
  }, [downloadState, onShowToast]);

  const handleIgnoreVersion = useCallback(() => {
    if (!pendingUpdate?.version) return;
    localStorage.setItem('ignoredVersion', pendingUpdate.version);
    setIgnoredVersion(pendingUpdate.version);
    setDownloadState('idle');
    setDownloadProgress(null);
    setShowUpdateDialog(false);
    setPendingUpdate(null);
    onShowToast(`已忽略版本 ${pendingUpdate.version}`, 'info');
  }, [onShowToast, pendingUpdate]);

  const handleShowDebugUpdateDialog = useCallback(() => {
    clearDebugDownloadTimer();
    setPendingUpdate({
      version: '2.0.0',
      releaseDate: new Date().toISOString(),
      notes: '这是一个调试用的更新弹窗\n\n更新内容：\n- 调试样式测试\n- 下载进度展示\n- 按钮交互测试',
    });
    setDebugDownloadState('idle');
    setDebugDownloadProgress(null);
    setShowUpdateDialog(true);
  }, [clearDebugDownloadTimer]);

  const handleDebugDownload = useCallback((options?: { resume?: boolean }) => {
    clearDebugDownloadTimer();
    const totalSize = debugDownloadProgress?.total ?? 10 * 1024 * 1024;
    const startPercent = options?.resume && debugDownloadProgress ? debugDownloadProgress.percent : 0;
    const startTransferred = options?.resume && debugDownloadProgress?.transferred
      ? debugDownloadProgress.transferred
      : 0;

    setDebugDownloadState('downloading');
    setDebugDownloadProgress(prev => {
      if (options?.resume && prev) {
        return { ...prev };
      }
      return {
        percent: startPercent,
        transferred: startTransferred,
        total: totalSize,
        bytesPerSecond: 1024,
      };
    });

    let currentProgress = startPercent;
    debugDownloadTimerRef.current = setInterval(() => {
      currentProgress += 0.5;
      if (currentProgress >= 100) {
        clearDebugDownloadTimer();
        setDebugDownloadState('completed');
        setDebugDownloadProgress({
          percent: 100,
          transferred: totalSize,
          total: totalSize,
          bytesPerSecond: 1024,
        });
        onShowToast('调试下载完成', 'success');
      } else {
        const transferred = Math.floor((currentProgress / 100) * totalSize);
        setDebugDownloadProgress({
          percent: currentProgress,
          transferred,
          total: totalSize,
          bytesPerSecond: 1024,
        });
      }
    }, 100);
  }, [clearDebugDownloadTimer, debugDownloadProgress, onShowToast]);

  const handleDebugPause = useCallback(() => {
    clearDebugDownloadTimer();
    setDebugDownloadState('paused');
  }, [clearDebugDownloadTimer]);

  const handleDebugResume = useCallback(() => {
    handleDebugDownload({ resume: true });
  }, [handleDebugDownload]);

  const handleDebugCancel = useCallback(() => {
    clearDebugDownloadTimer();
    setDebugDownloadState('idle');
    setDebugDownloadProgress(null);
    onShowToast('已取消下载', 'info');
  }, [clearDebugDownloadTimer, onShowToast]);

  useEffect(() => {
    if (!window.electron.onUpdateEvent) return undefined;

    const unsubscribe = window.electron.onUpdateEvent((event: UpdateEventPayload) => {
      switch (event.type) {
        case 'download-started':
        case 'download-resumed':
          setDownloadState('downloading');
          break;
        case 'download-progress':
          setDownloadState('downloading');
          setDownloadProgress({
            percent: event.progress.percent,
            transferred: event.progress.transferred,
            total: event.progress.total,
            bytesPerSecond: event.progress.bytesPerSecond,
          });
          break;
        case 'download-paused':
          setDownloadState('paused');
          break;
        case 'download-cancelled':
          setDownloadState('idle');
          setDownloadProgress(null);
          break;
        case 'update-downloaded':
          setDownloadState('completed');
          setDownloadProgress(prev => ({
            percent: 100,
            transferred: prev?.total ?? prev?.transferred,
            total: prev?.total ?? prev?.transferred,
            bytesPerSecond: prev?.bytesPerSecond,
          }));
          if (event.info) {
            setPendingUpdate(event.info);
          }
          onShowToast('更新包下载完成，退出后将自动安装', 'success');
          break;
        case 'update-error':
          setDownloadState('error');
          onShowToast(event.message || '下载更新失败', 'error');
          break;
        default:
          break;
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [onShowToast]);

  useEffect(() => {
    if (hasAutoCheckedUpdate) return;
    void handleCheckUpdate({ silent: true });
    setHasAutoCheckedUpdate(true);
  }, [handleCheckUpdate, hasAutoCheckedUpdate]);

  useEffect(() => () => {
    clearDebugDownloadTimer();
  }, [clearDebugDownloadTimer]);

  const closeUpdateDialog = useCallback(() => {
    setShowUpdateDialog(false);
    if (isDebugMode) {
      clearDebugDownloadTimer();
      setDebugDownloadState('idle');
      setDebugDownloadProgress(null);
    }
  }, [clearDebugDownloadTimer, isDebugMode]);

  return {
    appVersion,
    isCheckingUpdate,
    pendingUpdate,
    showUpdateDialog,
    ignoredVersion,
    downloadState,
    downloadProgress,
    isDebugMode,
    debugDownloadState,
    debugDownloadProgress,
    handleCheckUpdate,
    handleDownloadUpdate,
    handlePauseDownload,
    handleResumeDownload,
    handleCancelDownload,
    handleIgnoreVersion,
    handleShowDebugUpdateDialog,
    handleDebugDownload,
    handleDebugPause,
    handleDebugResume,
    handleDebugCancel,
    closeUpdateDialog,
    openUpdateDialog: () => setShowUpdateDialog(true),
  };
};

const UpdateSection: React.FC<UpdateSectionProps> = ({ onShowToast }) => {
  const updateManager = useUpdateManager(onShowToast);

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">关于与更新</h2>
        <p className="text-sm text-slate-500 mb-6">查看应用版本信息并检查更新</p>

        <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-5 mb-4 border border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-white/80 text-primary shadow-sm">
              <Info size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-600">当前版本</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900">
                  {updateManager.appVersion ? `v${updateManager.appVersion}` : '获取中...'}
                </span>
                {updateManager.pendingUpdate && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                    有新版本
                  </span>
                )}
                {updateManager.ignoredVersion && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-600">
                    已忽略 v{updateManager.ignoredVersion}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {updateManager.pendingUpdate && (
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
              onClick={() => updateManager.openUpdateDialog()}
            >
              <Info size={18} />
              查看更新详情
            </button>
          )}
          <button
            onClick={() => void updateManager.handleCheckUpdate()}
            disabled={updateManager.isCheckingUpdate}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              !updateManager.isCheckingUpdate
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw size={18} className={updateManager.isCheckingUpdate ? 'animate-spin' : ''} />
            {updateManager.isCheckingUpdate ? '检查中...' : '检查更新'}
          </button>
        </div>

        {updateManager.isDebugMode && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">开发模式</div>
              <span className="text-xs text-slate-500">调试工具</span>
            </div>
            <button
              onClick={updateManager.handleShowDebugUpdateDialog}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            >
              <Info size={18} />
              显示更新弹窗（调试）
            </button>
          </div>
        )}
      </div>

      <UpdateDialog
        open={updateManager.showUpdateDialog && Boolean(updateManager.pendingUpdate)}
        currentVersion={updateManager.appVersion}
        updateInfo={updateManager.pendingUpdate}
        status={
          updateManager.isDebugMode && updateManager.debugDownloadState !== 'idle'
            ? updateManager.debugDownloadState
            : updateManager.downloadState
        }
        progress={
          updateManager.isDebugMode && updateManager.debugDownloadProgress !== null
            ? updateManager.debugDownloadProgress
            : updateManager.downloadProgress
        }
        onClose={updateManager.closeUpdateDialog}
        onIgnore={updateManager.handleIgnoreVersion}
        onDownload={() => {
          if (updateManager.isDebugMode) {
            updateManager.handleDebugDownload();
          } else {
            void updateManager.handleDownloadUpdate();
          }
        }}
        onPause={updateManager.isDebugMode ? updateManager.handleDebugPause : updateManager.handlePauseDownload}
        onResume={updateManager.isDebugMode ? updateManager.handleDebugResume : updateManager.handleResumeDownload}
        onCancel={updateManager.isDebugMode ? updateManager.handleDebugCancel : updateManager.handleCancelDownload}
      />
    </>
  );
};

export default UpdateSection;
