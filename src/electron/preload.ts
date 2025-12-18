/**
 * Electron Preload 脚本
 * 安全地暴露 IPC API 到渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron';

type TrayControlAction = 'toggle-play' | 'next' | 'prev' | 'open-playlist' | 'show-main' | 'quit-app';
type TrayStatePayload = {
  title?: string;
  artist?: string;
  coverUrl?: string;
  isPlaying?: boolean;
  duration?: number;
  currentTime?: number;
};

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
      // 应用数据库 - 历史记录
      'app-db-history-add',   // 添加历史记录
      'app-db-history-get',   // 获取历史记录
      'app-db-history-clear', // 清空历史记录
      'app-db-history-delete', // 删除单条历史记录
      // 应用数据库 - 歌词偏移
      'app-db-offset-save',   // 保存歌词偏移
      'app-db-offset-get',    // 获取歌词偏移
      'app-db-offset-delete', // 删除歌词偏移
      'app-db-offset-get-all', // 获取所有歌词偏移
      // 应用数据库 - 歌单
      'app-db-playlist-create',      // 创建歌单
      'app-db-playlist-get-all',     // 获取所有歌单
      'app-db-playlist-get-detail',  // 获取歌单详情
      'app-db-playlist-update',      // 更新歌单
      'app-db-playlist-delete',      // 删除歌单
      'app-db-playlist-add-song',    // 添加歌曲到歌单
      'app-db-playlist-remove-songs', // 批量删除歌曲
      'app-db-playlist-reorder-songs', // 重排序歌曲
      'app-db-playlist-export',        // 导出歌单
      'app-db-playlist-export-multiple', // 批量导出歌单
      'app-db-playlist-preview-import',  // 预览导入文件
      'app-db-playlist-import',        // 导入歌单
      // 本地音乐
      'local-music-select-files',      // 选择音频文件
      'local-music-select-folder',     // 选择文件夹
      'local-music-scan-folder',       // 扫描并导入文件夹
      'local-music-add-files',         // 添加文件到虚拟文件夹
      'local-music-create-folder',     // 创建虚拟文件夹
      'local-music-get-folders',       // 获取所有虚拟文件夹
      'local-music-get-tracks',        // 获取文件夹的歌曲列表
      'local-music-delete-folder',     // 删除虚拟文件夹
      'local-music-rename-folder',     // 重命名虚拟文件夹
      'local-music-delete-track',      // 删除本地歌曲
      'local-music-get-track-by-id',   // 根据ID获取本地歌曲
      'window-control',                // 自定义标题栏的窗口控制
      // 应用更新
      'app-get-version',               // 获取应用版本
      'app-check-update',              // 检查更新
      'app-download-update',           // 下载更新包
      'app-update-control',            // 控制更新下载（暂停/继续/取消）
    ];

    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }

    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * 订阅更新事件（下载进度、错误等）
   */
  onUpdateEvent: (callback: (event: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data);
    ipcRenderer.on('app-update-event', handler);
    return () => ipcRenderer.removeListener('app-update-event', handler);
  },

  /**
   * 主动发送消息（仅开放托盘状态上报）
   */
  send: (channel: string, payload: unknown) => {
    const validSendChannels = ['player-state-update'];
    if (!validSendChannels.includes(channel)) {
      throw new Error(`Invalid IPC send channel: ${channel}`);
    }
    ipcRenderer.send(channel, payload);
  },

  /**
   * 托盘窗口-订阅状态
   */
  onTrayState: (callback: (state: TrayStatePayload) => void) => {
    const channel = 'tray-state';
    const handler = (_event: unknown, data: unknown) => {
      callback(data as TrayStatePayload);
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  /**
   * 托盘窗口-发出控制指令
   */
  sendTrayControl: (action: TrayControlAction) => {
    const validActions: TrayControlAction[] = ['toggle-play', 'next', 'prev', 'open-playlist', 'show-main', 'quit-app'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid tray control action: ${action}`);
    }
    ipcRenderer.send('tray-control', action);
  },

  /**
   * 监听托盘控制指令
   */
  onPlayerControl: (callback: (action: 'toggle-play' | 'next' | 'prev' | 'open-playlist' | 'show-main' | 'quit-app') => void) => {
    const channel = 'tray-player-control';
    const handler = (_event: unknown, action: unknown) => {
      callback(action as 'toggle-play' | 'next' | 'prev' | 'open-playlist' | 'show-main' | 'quit-app');
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
