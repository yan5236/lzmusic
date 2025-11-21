/**
 * 网易云音乐 API 处理器
 * 使用 NeteaseCloudMusicApi 模块处理歌词搜索和获取
 */

import { ipcMain } from 'electron';
import { createRequire } from 'module';

// 在 ES 模块中使用 require 导入 CommonJS 模块
const require = createRequire(import.meta.url);
const NeteaseAPI = require('NeteaseCloudMusicApi');

/**
 * 搜索结果接口
 */
interface SearchResult {
  id: number;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string };
}

/**
 * 歌词数据接口
 */
interface LyricsData {
  lrc?: string;      // 原文歌词
  tlyric?: string;   // 翻译歌词
  romalrc?: string;  // 罗马音歌词
}

/**
 * 注册网易云音乐相关的 IPC 处理器
 */
export function registerNeteaseHandlers(): void {
  // 搜索歌曲
  ipcMain.handle('netease-search-song', async (_event, keywords: string) => {
    try {
      const response = await NeteaseAPI.search({
        keywords,
        type: 1, // 1表示单曲搜索
        limit: 20, // 返回前20条结果
      });

      if (response.body.code === 200) {
        const songs = response.body.result.songs || [];
        return {
          success: true,
          data: songs.map((song: SearchResult) => ({
            id: song.id,
            name: song.name,
            artist: song.artists.map((a) => a.name).join('/'),
            album: song.album.name,
          })),
        };
      } else {
        return {
          success: false,
          error: '搜索失败',
        };
      }
    } catch (error) {
      console.error('网易云搜索错误:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 获取歌词
  ipcMain.handle('netease-get-lyrics', async (_event, songId: number) => {
    try {
      const response = await NeteaseAPI.lyric({
        id: songId,
      });

      if (response.body.code === 200) {
        const lyricsData: LyricsData = {};

        // 原文歌词
        if (response.body.lrc?.lyric) {
          lyricsData.lrc = response.body.lrc.lyric;
        }

        // 翻译歌词
        if (response.body.tlyric?.lyric) {
          lyricsData.tlyric = response.body.tlyric.lyric;
        }

        // 罗马音歌词
        if (response.body.romalrc?.lyric) {
          lyricsData.romalrc = response.body.romalrc.lyric;
        }

        return {
          success: true,
          data: lyricsData,
        };
      } else {
        return {
          success: false,
          error: '获取歌词失败',
        };
      }
    } catch (error) {
      console.error('网易云获取歌词错误:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });
}

/**
 * 解析LRC格式歌词为数组
 * @param lrcText LRC格式的歌词文本
 * @returns 歌词行数组,格式为 "[时间]歌词文本"
 */
export function parseLyrics(lrcText: string): string[] {
  if (!lrcText) return [];

  const lines = lrcText.split('\n');
  const lyrics: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 过滤掉空行和元数据行(如[ar:歌手]等)
    if (trimmed && trimmed.match(/^\[\d+:\d+\.\d+\]/)) {
      lyrics.push(trimmed);
    }
  }

  return lyrics;
}
