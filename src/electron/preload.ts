/**
 * Electron Preload 脚本
 * 安全地暴露 IPC API 到渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron';

// 暴露到 window.electron 的 API
contextBridge.exposeInMainWorld('electron', {
  /**
   * IPC invoke 方法
   * @param channel IPC 频道名称
   * @param args 参数
   */
  invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
    // 只允许指定的频道
    const validChannels = ['search-videos', 'get-video-info', 'is-bvid'];

    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }

    return ipcRenderer.invoke(channel, ...args);
  },
});
