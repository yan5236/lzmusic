/**
 * 歌单 IPC 处理器
 * 提供渲染进程与歌单数据库交互的接口
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
 * 注册歌单相关的 IPC 处理器
 */
export function registerPlaylistHandlers(): void {
  // ========== 歌单基本操作 ==========

  // 创建歌单
  ipcMain.handle(
    'app-db-playlist-create',
    async (_event, name: string, description?: string) => {
      try {
        const id = appDatabase.createPlaylist({ name, description });
        return { success: true, id };
      } catch (error) {
        console.error('创建歌单失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }
  );

  // 获取所有歌单
  ipcMain.handle('app-db-playlist-get-all', async () => {
    try {
      const playlists = appDatabase.getAllPlaylists();
      return { success: true, data: playlists };
    } catch (error) {
      console.error('获取歌单列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        data: [],
      };
    }
  });

  // 获取歌单详情
  ipcMain.handle('app-db-playlist-get-detail', async (_event, playlistId: string) => {
    try {
      const detail = appDatabase.getPlaylistDetail(playlistId);
      if (!detail) {
        return {
          success: false,
          error: '歌单不存在',
        };
      }

      // 将 pages 字段从 JSON 字符串转回数组
      const formattedSongs = detail.songs.map(song => ({
        ...song,
        pages: song.pages ? JSON.parse(song.pages as unknown as string) : undefined,
      }));

      return {
        success: true,
        data: {
          playlist: detail.playlist,
          songs: formattedSongs,
        },
      };
    } catch (error) {
      console.error('获取歌单详情失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 更新歌单信息
  ipcMain.handle(
    'app-db-playlist-update',
    async (
      _event,
      playlistId: string,
      updates: { name?: string; description?: string; coverUrl?: string }
    ) => {
      try {
        appDatabase.updatePlaylist(playlistId, updates);
        return { success: true };
      } catch (error) {
        console.error('更新歌单失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }
  );

  // 删除歌单
  ipcMain.handle('app-db-playlist-delete', async (_event, playlistId: string) => {
    try {
      appDatabase.deletePlaylist(playlistId);
      return { success: true };
    } catch (error) {
      console.error('删除歌单失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // ========== 歌单歌曲操作 ==========

  // 添加歌曲到歌单
  ipcMain.handle(
    'app-db-playlist-add-song',
    async (_event, playlistId: string, song: SongData) => {
      try {
        const record: HistoryRecord = {
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
          playedAt: Date.now(),
        };
        appDatabase.addSongToPlaylist(playlistId, record);
        return { success: true };
      } catch (error) {
        console.error('添加歌曲到歌单失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }
  );

  // 批量删除歌曲
  ipcMain.handle(
    'app-db-playlist-remove-songs',
    async (_event, playlistId: string, songIds: string[]) => {
      try {
        appDatabase.removeSongsFromPlaylist(playlistId, songIds);
        return { success: true };
      } catch (error) {
        console.error('从歌单删除歌曲失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }
  );

  // 重排序歌曲
  ipcMain.handle(
    'app-db-playlist-reorder-songs',
    async (_event, playlistId: string, songIds: string[]) => {
      try {
        appDatabase.reorderPlaylistSongs(playlistId, songIds);
        return { success: true };
      } catch (error) {
        console.error('重排序歌单歌曲失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }
  );

  // ========== 歌单导出导入操作 ==========

  // 导出单个歌单
  ipcMain.handle(
    'app-db-playlist-export',
    async (_event, playlistId: string) => {
      try {
        const data = appDatabase.exportPlaylistData(playlistId);
        if (!data) {
          return {
            success: false,
            error: '歌单不存在',
          };
        }
        return { success: true, data };
      } catch (error) {
        console.error('导出歌单失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }
  );

  // 批量导出多个歌单
  ipcMain.handle(
    'app-db-playlist-export-multiple',
    async (_event, playlistIds: string[]) => {
      try {
        const data = appDatabase.exportMultiplePlaylists(playlistIds);
        return { success: true, data };
      } catch (error) {
        console.error('批量导出歌单失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }
  );

  // 预览导入文件（解析文件获取歌单列表，不实际导入）
  ipcMain.handle(
    'app-db-playlist-preview-import',
    async (_event, jsonData: string) => {
      try {
        const parsed = JSON.parse(jsonData);
        const playlists: Array<{ id: string; name: string; songCount: number }> = [];

        // 检查是否为多歌单格式（type: 'playlists'）
        if (parsed.type === 'playlists' && Array.isArray(parsed.playlists)) {
          for (let i = 0; i < parsed.playlists.length; i++) {
            const item = parsed.playlists[i];
            if (item && item.name) {
              // 使用索引作为临时ID，确保预览和导入时ID一致
              playlists.push({
                id: `import-index-${i}`,
                name: item.name,
                songCount: Array.isArray(item.songs) ? item.songs.length : 0,
              });
            }
          }
        }
        // 检查是否为单歌单格式（type: 'playlist'）
        else if (parsed.type === 'playlist' && parsed.playlist) {
          playlists.push({
            id: 'import-index-0',
            name: parsed.playlist.name,
            songCount: Array.isArray(parsed.playlist.songs) ? parsed.playlist.songs.length : 0,
          });
        }

        return {
          success: true,
          playlists,
          isMultiple: playlists.length > 1,
        };
      } catch (error) {
        console.error('预览导入文件失败:', error);
        return {
          success: false,
          playlists: [],
          isMultiple: false,
          error: error instanceof Error ? error.message : '文件格式无效',
        };
      }
    }
  );

  // 导入歌单（支持选择性导入）
  ipcMain.handle(
    'app-db-playlist-import',
    async (_event, jsonData: string, selectedIds?: string[]) => {
      try {
        const result = appDatabase.importPlaylistData(jsonData, selectedIds);
        return result;
      } catch (error) {
        console.error('导入歌单失败:', error);
        return {
          success: false,
          imported: 0,
          failed: 0,
          errors: [error instanceof Error ? error.message : '未知错误'],
        };
      }
    }
  );

  console.log('歌单IPC处理器已注册');
}
