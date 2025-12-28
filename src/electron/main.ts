import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { isDev } from './util.js';
import { registerBilibiliHandlers } from './api/bilibiliHandler.js';
import { registerNeteaseHandlers } from './api/neteaseHandler.js';
import { registerLyricsDbHandlers } from './api/lyricsDbHandler.js';
import { registerAppDbHandlers } from './api/appDbHandler.js';
import { registerPlaylistHandlers } from './api/playlistHandler.js';
import { registerLocalMusicHandlers } from './api/localMusicHandler.js';
import { lyricsDatabase } from './database/lyricsDatabase.js';
import { appDatabase } from './database/appDatabase.js';
import { registerLocalmusicScheme, registerLocalMusicProtocolHandler } from './protocols/localMusicProtocol.js';
import { configureSessionSecurity } from './sessionSecurity.js';
import { registerWindowControlHandler } from './ipc/windowControls.js';
import { registerUpdaterIpcHandlers, setupUpdater } from './updater.js';
import { createMainWindow, loadMainWindowURL } from './windows/mainWindow.js';
import { TrayManager } from './trayManager.js';
import type { TrayControlAction, TrayPlayerState } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let isQuitting = false;

registerLocalmusicScheme();

const requestAppQuit = () => {
  if (isQuitting) return;

  isQuitting = true;
  trayManager?.destroy();
  trayManager = null;
  app.quit();
};

function registerAppIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  registerBilibiliHandlers();
  registerNeteaseHandlers();
  registerLyricsDbHandlers();
  registerAppDbHandlers();
  registerPlaylistHandlers();
  registerLocalMusicHandlers();
  registerWindowControlHandler(getMainWindow, requestAppQuit);
  registerUpdaterIpcHandlers(getMainWindow);

  // 打开外部链接
  ipcMain.handle('open-external-url', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('打开外部链接失败:', error);
      return { success: false, error: '打开链接失败' };
    }
  });
}

function wireTrayChannels() {
  ipcMain.on('player-state-update', (_event, payload: Partial<TrayPlayerState>) => {
    if (!payload) return;
    trayManager?.updateState(payload);
  });

  ipcMain.on('tray-control', (_event, action: TrayControlAction) => {
    trayManager?.handleAction(action);
  });
}

function createMainProcessResources() {
  const appBasePath = app.getAppPath();
  const iconPath = path.join(appBasePath, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  const preloadPath = path.join(__dirname, '..', 'preload.js');

  mainWindow = createMainWindow({
    isMac,
    iconPath,
    preloadPath,
    shouldHideOnClose: () => {
      if (isQuitting) {
        return false;
      }
      return true;
    },
    onClosed: () => {
      mainWindow = null;
    },
  });
  loadMainWindowURL(mainWindow, isDev(), appBasePath);

  trayManager = new TrayManager({
    preloadPath,
    iconPath,
    appBasePath,
    isDev: isDev(),
    getMainWindow: () => mainWindow,
    onRequestQuit: requestAppQuit,
  });
  trayManager.initialize();
}

app.on('ready', () => {
  registerLocalMusicProtocolHandler();

  lyricsDatabase.initialize();
  appDatabase.initialize();

  registerAppIpcHandlers(() => mainWindow);

  configureSessionSecurity(isDev());

  createMainProcessResources();
  wireTrayChannels();

  setupUpdater(() => mainWindow);
});

app.on('before-quit', () => {
  isQuitting = true;
  trayManager?.destroy();
  trayManager = null;
  lyricsDatabase.close();
  appDatabase.close();
});
