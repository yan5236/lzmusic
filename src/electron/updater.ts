import { app, BrowserWindow, ipcMain } from 'electron';
import electronUpdater from 'electron-updater';
import { CancellationError, CancellationToken } from 'builder-util-runtime';

// 从 CommonJS 模块解构 autoUpdater
const { autoUpdater } = electronUpdater;

const updateFeedURL = (process.env.UPDATE_FEED_URL || 'https://github.com/yan5236/lzmusic').replace(/\/?$/, '/');
const UPDATE_EVENT_CHANNEL = 'app-update-event';

let isUpdateFeedConfigured = false;
let isUpdateEventsInitialized = false;
let downloadCancellationToken: CancellationToken | null = null;
let isDownloadingUpdate = false;
let downloadControlAction: 'pause' | 'cancel' | null = null;

function configureUpdateFeed() {
  if (!app.isPackaged) {
    return;
  }

  try {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: updateFeedURL,
    });
    isUpdateFeedConfigured = true;
    console.log('[update] feed configured:', updateFeedURL);
  } catch (error) {
    console.error('[update] 配置更新源失败:', error);
  }
}

function sendUpdateEvent(getMainWindow: () => BrowserWindow | null, payload: unknown) {
  const target = getMainWindow();
  if (target?.webContents && !target.isDestroyed()) {
    target.webContents.send(UPDATE_EVENT_CHANNEL, payload);
  }
}

function initAutoUpdaterEvents(getMainWindow: () => BrowserWindow | null) {
  if (isUpdateEventsInitialized) {
    return;
  }

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateEvent(getMainWindow, {
      type: 'download-progress',
      progress: {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      },
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateEvent(getMainWindow, {
      type: 'update-downloaded',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      },
    });
  });

  autoUpdater.on('error', (error) => {
    sendUpdateEvent(getMainWindow, {
      type: 'update-error',
      message: (error as Error)?.message || '更新出错',
    });
  });

  isUpdateEventsInitialized = true;
}

function ensureUpdateSetup(getMainWindow: () => BrowserWindow | null) {
  if (!isUpdateFeedConfigured) {
    configureUpdateFeed();
  }

  initAutoUpdaterEvents(getMainWindow);
}

async function startUpdateDownload(getMainWindow: () => BrowserWindow | null, isResume = false) {
  if (!app.isPackaged) {
    return {
      success: false,
      error: '当前为开发环境，打包后的应用才可下载更新',
    };
  }

  ensureUpdateSetup(getMainWindow);

  if (isDownloadingUpdate) {
    return {
      success: false,
      error: '已有更新正在下载，请稍后',
    };
  }

  downloadControlAction = null;
  isDownloadingUpdate = true;
  downloadCancellationToken = new CancellationToken();
  sendUpdateEvent(getMainWindow, { type: isResume ? 'download-resumed' : 'download-started' });

  try {
    await autoUpdater.downloadUpdate(downloadCancellationToken);
    return { success: true };
  } catch (error) {
    const controlAction = downloadControlAction;
    downloadControlAction = null;

    if (downloadCancellationToken?.cancelled || error instanceof CancellationError) {
      sendUpdateEvent(getMainWindow, { type: controlAction === 'cancel' ? 'download-cancelled' : 'download-paused' });
      return { success: false, cancelled: true };
    }

    const message = (error as Error)?.message || '下载更新失败';
    console.error('[update] 下载更新失败:', error);
    sendUpdateEvent(getMainWindow, { type: 'update-error', message });
    return {
      success: false,
      error: message,
    };
  } finally {
    downloadControlAction = null;
    downloadCancellationToken?.dispose();
    downloadCancellationToken = null;
    isDownloadingUpdate = false;
  }
}

function pauseUpdateDownload() {
  if (!isDownloadingUpdate || !downloadCancellationToken || downloadCancellationToken.cancelled) {
    return {
      success: false,
      error: '当前没有正在进行的下载任务',
    };
  }

  downloadControlAction = 'pause';
  downloadCancellationToken.cancel();
  return { success: true };
}

function cancelUpdateDownload() {
  if (!isDownloadingUpdate || !downloadCancellationToken || downloadCancellationToken.cancelled) {
    return {
      success: false,
      error: '当前没有正在进行的下载任务',
    };
  }

  downloadControlAction = 'cancel';
  downloadCancellationToken.cancel();
  return { success: true };
}

export function setupUpdater(getMainWindow: () => BrowserWindow | null) {
  ensureUpdateSetup(getMainWindow);
}

export function registerUpdaterIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('app-get-version', () => ({
    success: true,
    version: app.getVersion(),
  }));

  ipcMain.handle('app-check-update', async () => {
    const currentVersion = app.getVersion();

    if (!app.isPackaged) {
      return {
        success: false,
        currentVersion,
        error: '当前为开发环境，打包后的应用才可检查更新',
      };
    }

    ensureUpdateSetup(getMainWindow);

    try {
      const result = await autoUpdater.checkForUpdates();
      const updateInfo = result?.updateInfo;

      if (!updateInfo || !updateInfo.version || updateInfo.version === currentVersion) {
        return {
          success: true,
          currentVersion,
          updateAvailable: false,
          updateInfo: undefined,
        };
      }

      return {
        success: true,
        currentVersion,
        updateAvailable: true,
        updateInfo: {
          version: updateInfo.version,
          releaseDate: updateInfo.releaseDate,
          notes: typeof updateInfo.releaseNotes === 'string' ? updateInfo.releaseNotes : undefined,
        },
      };
    } catch (error) {
      console.error('[update] 检查更新失败:', error);
      return {
        success: false,
        currentVersion,
        error: (error as Error).message || '检查更新失败',
      };
    }
  });

  ipcMain.handle('app-download-update', async (_event, options?: { resume?: boolean }) => (
    startUpdateDownload(getMainWindow, Boolean(options?.resume))
  ));

  ipcMain.handle('app-update-control', async (_event, action: 'pause' | 'resume' | 'cancel') => {
    if (!app.isPackaged) {
      return {
        success: false,
        error: '当前为开发环境，打包后的应用才可管理更新下载',
      };
    }

    if (action === 'pause') {
      return pauseUpdateDownload();
    }

    if (action === 'cancel') {
      return cancelUpdateDownload();
    }

    if (action === 'resume') {
      return startUpdateDownload(getMainWindow, true);
    }

    return { success: false, error: '未知的更新控制操作' };
  });
}
