import { BrowserWindow, ipcMain } from 'electron';

type WindowControlAction = 'minimize' | 'toggle-maximize' | 'close' | 'get-state';

export function registerWindowControlHandler(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('window-control', (event, action: WindowControlAction) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow();

    if (!targetWindow) {
      return { success: false, isMaximized: false };
    }

    switch (action) {
      case 'minimize':
        targetWindow.minimize();
        break;
      case 'toggle-maximize':
        if (targetWindow.isMaximized()) {
          targetWindow.unmaximize();
        } else {
          targetWindow.maximize();
        }
        break;
      case 'close':
        targetWindow.close();
        break;
      case 'get-state':
      default:
        break;
    }

    return { success: true, isMaximized: targetWindow.isMaximized() };
  });
}
