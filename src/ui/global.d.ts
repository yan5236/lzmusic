/**
 * 全局类型声明
 * 为 window.electron API 提供 TypeScript 类型支持
 */

import type { SearchResult, BilibiliVideo, AudioUrlResponse } from '../shared/types';
import type { NeteaseSearchResult } from './types';

// 网易云音乐 API 响应类型
interface NeteaseSearchResponse {
  success: boolean;
  data: NeteaseSearchResult[];
  error?: string;
}

interface NeteaseLyricsResponse {
  success: boolean;
  data: {
    lrc: string;
    tlyric?: string;
    romalrc?: string;
  };
  error?: string;
}

// 歌词数据库 API 响应类型
interface LyricsDbSaveResponse {
  success: boolean;
  error?: string;
}

interface LyricsDbGetResponse {
  success: boolean;
  data: string[] | null;
  error?: string;
}

interface LyricsDbHasResponse {
  success: boolean;
  exists: boolean;
  error?: string;
}

interface LyricsDbDeleteResponse {
  success: boolean;
  error?: string;
}

declare global {
  interface Window {
    electron: {
      invoke(channel: 'search-videos', keyword: string, page: number): Promise<SearchResult>;
      invoke(channel: 'get-video-info', bvid: string): Promise<BilibiliVideo>;
      invoke(channel: 'is-bvid', input: string): Promise<boolean>;
      invoke(channel: 'get-audio-url', bvid: string, cid: number): Promise<AudioUrlResponse>;
      invoke(channel: 'netease-search-song', keyword: string): Promise<NeteaseSearchResponse>;
      invoke(channel: 'netease-get-lyrics', songId: number): Promise<NeteaseLyricsResponse>;
      invoke(channel: 'lyrics-db-save', id: string, lyrics: string[], source?: 'bilibili' | 'local' | 'netease'): Promise<LyricsDbSaveResponse>;
      invoke(channel: 'lyrics-db-get', id: string): Promise<LyricsDbGetResponse>;
      invoke(channel: 'lyrics-db-has', id: string): Promise<LyricsDbHasResponse>;
      invoke(channel: 'lyrics-db-delete', id: string): Promise<LyricsDbDeleteResponse>;
    };
  }
}

export {};
