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
    const validChannels = [
      'search-videos',
      'get-video-info',
      'is-bvid',
      'get-audio-url',
      'get-search-suggestions', // 获取搜索建议
      'netease-search-song',  // 网易云搜索歌曲
      'netease-get-lyrics',   // 网易云获取歌词
      'lyrics-db-save',       // 保存歌词到数据库
      'lyrics-db-get',        // 从数据库获取歌词
      'lyrics-db-has',        // 检查歌词是否存在
      'lyrics-db-delete',     // 删除歌词
    ];

    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }

    return ipcRenderer.invoke(channel, ...args);
  },
});
