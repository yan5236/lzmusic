/**
 * 应用数据库 IPC 处理器
 * 提供渲染进程与应用数据库交互的接口
 */

import { ipcMain } from 'electron';
import { appDatabase, type HistoryRecord } from '../database/appDatabase.js';

// 从渲染进程传来的歌曲数据结构
interface SongData {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  duration: number;
  bvid?: string;
  cid?: number;
  pages?: Array<{ page: number; part: string; cid: number }>;
  source?: 'local' | 'bilibili';
}

/**
 * 注册应用数据库相关的 IPC 处理器
 */
export function registerAppDbHandlers(): void {
  // ========== 历史记录相关 ==========

  // 添加历史记录
  ipcMain.handle('app-db-history-add', async (_event, song: SongData) => {
    try {
      const record: Omit<HistoryRecord, 'playedAt'> = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        coverUrl: song.coverUrl,
        duration: song.duration,
        bvid: song.bvid,
        cid: song.cid,
        pages: song.pages ? JSON.stringify(song.pages) : undefined,
        source: song.source,
      };
      appDatabase.addHistory(record);
      return { success: true };
    } catch (error) {
      console.error('添加历史记录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 获取历史记录
  ipcMain.handle('app-db-history-get', async () => {
    try {
      const history = appDatabase.getHistory();
      // 将 pages 字段从 JSON 字符串转回数组
      const formattedHistory = history.map(record => ({
        ...record,
        pages: record.pages ? JSON.parse(record.pages) : undefined,
      }));
      return { success: true, data: formattedHistory };
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        data: [],
      };
    }
  });

  // 清空历史记录
  ipcMain.handle('app-db-history-clear', async () => {
    try {
      appDatabase.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('清空历史记录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 删除单条历史记录
  ipcMain.handle('app-db-history-delete', async (_event, id: string) => {
    try {
      appDatabase.deleteHistory(id);
      return { success: true };
    } catch (error) {
      console.error('删除历史记录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // ========== 歌词偏移相关 ==========

  // 保存歌词偏移
  ipcMain.handle('app-db-offset-save', async (_event, songId: string, offset: number) => {
    try {
      appDatabase.saveLyricsOffset(songId, offset);
      return { success: true };
    } catch (error) {
      console.error('保存歌词偏移失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 获取歌词偏移
  ipcMain.handle('app-db-offset-get', async (_event, songId: string) => {
    try {
      const offset = appDatabase.getLyricsOffset(songId);
      return { success: true, offset };
    } catch (error) {
      console.error('获取歌词偏移失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        offset: 0,
      };
    }
  });

  // 删除歌词偏移
  ipcMain.handle('app-db-offset-delete', async (_event, songId: string) => {
    try {
      appDatabase.deleteLyricsOffset(songId);
      return { success: true };
    } catch (error) {
      console.error('删除歌词偏移失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 获取所有歌词偏移
  ipcMain.handle('app-db-offset-get-all', async () => {
    try {
      const offsets = appDatabase.getAllLyricsOffsets();
      return { success: true, data: offsets };
    } catch (error) {
      console.error('获取所有歌词偏移失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        data: [],
      };
    }
  });

  console.log('应用数据库IPC处理器已注册');
}
