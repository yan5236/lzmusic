/**
 * 歌词数据库 IPC 处理器
 * 提供渲染进程与数据库交互的接口
 */

import { ipcMain } from 'electron';
import { lyricsDatabase } from '../database/lyricsDatabase.js';

/**
 * 注册歌词数据库相关的 IPC 处理器
 */
export function registerLyricsDbHandlers(): void {
  // 保存歌词
  ipcMain.handle(
    'lyrics-db-save',
    async (
      _event,
      id: string,
      lyrics: string[],
      source: 'bilibili' | 'local' | 'netease' = 'bilibili'
    ) => {
      try {
        lyricsDatabase.saveLyrics(id, lyrics, source);
        return { success: true };
      } catch (error) {
        console.error('保存歌词到数据库失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }
  );

  // 获取歌词
  ipcMain.handle('lyrics-db-get', async (_event, id: string) => {
    try {
      const lyrics = lyricsDatabase.getLyrics(id);
      return { success: true, data: lyrics };
    } catch (error) {
      console.error('从数据库获取歌词失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        data: null,
      };
    }
  });

  // 检查歌词是否存在
  ipcMain.handle('lyrics-db-has', async (_event, id: string) => {
    try {
      const exists = lyricsDatabase.hasLyrics(id);
      return { success: true, exists };
    } catch (error) {
      console.error('检查歌词是否存在失败:', error);
      return {
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 删除歌词
  ipcMain.handle('lyrics-db-delete', async (_event, id: string) => {
    try {
      lyricsDatabase.deleteLyrics(id);
      return { success: true };
    } catch (error) {
      console.error('从数据库删除歌词失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  console.log('歌词数据库IPC处理器已注册');
}
