import { BrowserWindow, Tray, nativeImage, screen } from 'electron';
import path from 'path';
import type { TrayControlAction, TrayPlayerState } from './types.js';
import { defaultTrayState } from './types.js';

type TrayManagerOptions = {
  preloadPath: string;
  iconPath: string;
  appBasePath: string;
  isDev: boolean;
  getMainWindow: () => BrowserWindow | null;
  onRequestQuit: () => void;
};

export class TrayManager {
  private tray: Tray | null = null;
  private trayWindow: BrowserWindow | null = null;
  private latestState: TrayPlayerState = defaultTrayState;
  private readonly options: TrayManagerOptions;

  constructor(options: TrayManagerOptions) {
    this.options = options;
  }

  initialize() {
    const trayIcon = nativeImage.createFromPath(this.options.iconPath);
    if (!trayIcon.isEmpty()) {
      trayIcon.setTemplateImage(false);
    }

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('LZMusic - 后台播放中');

    this.tray.on('click', () => this.focusMainWindow());
    this.tray.on('right-click', () => this.toggleWindow());
  }

  updateState(payload: Partial<TrayPlayerState>) {
    this.latestState = {
      ...this.latestState,
      ...payload,
      title: payload.title ?? this.latestState.title,
      artist: payload.artist ?? this.latestState.artist,
      coverUrl: payload.coverUrl ?? this.latestState.coverUrl,
      isPlaying: payload.isPlaying ?? this.latestState.isPlaying,
      duration: payload.duration ?? this.latestState.duration,
      currentTime: payload.currentTime ?? this.latestState.currentTime,
    };

    if (this.tray?.isDestroyed()) {
      this.tray = null;
    }

    if (this.tray) {
      const tipTitle = this.latestState.title || 'LZMusic';
      const tipArtist = this.latestState.artist ? ` - ${this.latestState.artist}` : '';
      this.tray.setToolTip(`LZMusic${tipTitle ? ` - ${tipTitle}${tipArtist}` : ''}`);
    }

    if (this.trayWindow && !this.trayWindow.isDestroyed()) {
      this.trayWindow.webContents.send('tray-state', this.latestState);
    }
  }

  handleAction(action: TrayControlAction) {
    if (action === 'quit-app') {
      this.trayWindow?.hide();
      this.options.onRequestQuit();
      return;
    }

    if (action === 'show-main' || action === 'open-playlist') {
      this.focusMainWindow();
    }

    const mainWindow = this.options.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tray-player-control', action);
    }
  }

  toggleWindow() {
    if (!this.tray) return;
    if (!this.trayWindow) {
      this.createTrayWindow();
    }

    if (!this.trayWindow) return;

    if (this.trayWindow.isVisible()) {
      this.trayWindow.hide();
      return;
    }

    const trayBounds = this.tray.getBounds();
    const windowBounds = this.trayWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const screenWidth = primaryDisplay.workAreaSize.width;
    const screenHeight = primaryDisplay.workAreaSize.height;

    const x = Math.min(
      Math.max(0, Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)),
      screenWidth - windowBounds.width
    );
    const isTaskbarBottom = trayBounds.y > screenHeight / 2;
    const y = isTaskbarBottom
      ? Math.max(0, Math.round(trayBounds.y - windowBounds.height - 8))
      : Math.round(trayBounds.y + trayBounds.height + 8);

    this.trayWindow.setPosition(x, y);
    this.trayWindow.webContents.send('tray-state', this.latestState);
    this.trayWindow.showInactive();
    this.trayWindow.focus();
  }

  destroy() {
    this.trayWindow?.destroy();
    this.trayWindow = null;
    this.tray?.destroy();
    this.tray = null;
  }

  private focusMainWindow() {
    const mainWindow = this.options.getMainWindow();
    if (!mainWindow) return;

    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    this.trayWindow?.hide();
  }

  private createTrayWindow() {
    this.trayWindow = new BrowserWindow({
      width: 320,
      height: 360,
      show: false,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: this.options.preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      }
    });

    this.trayWindow.removeMenu();
    if (this.options.isDev) {
      this.trayWindow.loadURL('http://localhost:5238/#/tray');
    } else {
      const trayEntry = path.join(this.options.appBasePath, 'dist-react', 'index.html');
      this.trayWindow.loadFile(trayEntry, { hash: 'tray' });
    }

    this.trayWindow.on('blur', () => {
      this.trayWindow?.hide();
    });

    this.trayWindow.on('close', (event) => {
      event.preventDefault();
      this.trayWindow?.hide();
    });

    this.trayWindow.webContents.on('did-finish-load', () => {
      this.trayWindow?.webContents.send('tray-state', this.latestState);
    });
  }
}
