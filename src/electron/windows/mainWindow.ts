import { BrowserWindow } from 'electron';
import path from 'path';

type CreateMainWindowOptions = {
  isMac: boolean;
  iconPath: string;
  preloadPath: string;
  shouldHideOnClose: () => boolean;
  onClosed?: () => void;
};

export function createMainWindow(options: CreateMainWindowOptions) {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    title: 'LZMusic',
    titleBarStyle: options.isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#0f172a',
    trafficLightPosition: options.isMac ? { x: 14, y: 14 } : undefined,
    autoHideMenuBar: true,
    icon: options.iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // preload 需要禁用 sandbox
      preload: options.preloadPath,
    }
  });

  mainWindow.on('close', (event) => {
    if (options.shouldHideOnClose()) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    options.onClosed?.();
  });

  return mainWindow;
}

export function loadMainWindowURL(mainWindow: BrowserWindow, isDev: boolean, appPath: string) {
  if (isDev) {
    mainWindow.loadURL('http://localhost:5238');
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
  } else {
    mainWindow.loadFile(path.join(appPath, '/dist-react/index.html'));
  }
}
