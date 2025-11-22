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

// 应用数据库 API 响应类型
interface AppDbHistoryRecord {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  duration: number;
  bvid?: string;
  cid?: number;
  pages?: Array<{ page: number; part: string; cid: number; duration: number }>;
  source?: 'local' | 'bilibili';
  playedAt: number;
}

interface AppDbHistoryAddResponse {
  success: boolean;
  error?: string;
}

interface AppDbHistoryGetResponse {
  success: boolean;
  data: AppDbHistoryRecord[];
  error?: string;
}

interface AppDbHistoryClearResponse {
  success: boolean;
  error?: string;
}

interface AppDbHistoryDeleteResponse {
  success: boolean;
  error?: string;
}

interface AppDbOffsetSaveResponse {
  success: boolean;
  error?: string;
}

interface AppDbOffsetGetResponse {
  success: boolean;
  offset: number;
  error?: string;
}

interface AppDbOffsetDeleteResponse {
  success: boolean;
  error?: string;
}

interface AppDbOffsetGetAllResponse {
  success: boolean;
  data: Array<{ songId: string; offset: number }>;
  error?: string;
}

// 搜索建议响应类型
type SearchSuggestionsResponse = string[];

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
      // 搜索建议
      invoke(channel: 'get-search-suggestions', keyword: string): Promise<SearchSuggestionsResponse>;
      // 应用数据库 - 历史记录
      invoke(channel: 'app-db-history-add', song: {
        id: string;
        title: string;
        artist: string;
        album?: string;
        coverUrl: string;
        duration: number;
        bvid?: string;
        cid?: number;
        pages?: Array<{ page: number; part: string; cid: number; duration: number }>;
        source?: 'local' | 'bilibili';
      }): Promise<AppDbHistoryAddResponse>;
      invoke(channel: 'app-db-history-get'): Promise<AppDbHistoryGetResponse>;
      invoke(channel: 'app-db-history-clear'): Promise<AppDbHistoryClearResponse>;
      invoke(channel: 'app-db-history-delete', id: string): Promise<AppDbHistoryDeleteResponse>;
      // 应用数据库 - 歌词偏移
      invoke(channel: 'app-db-offset-save', songId: string, offset: number): Promise<AppDbOffsetSaveResponse>;
      invoke(channel: 'app-db-offset-get', songId: string): Promise<AppDbOffsetGetResponse>;
      invoke(channel: 'app-db-offset-delete', songId: string): Promise<AppDbOffsetDeleteResponse>;
      invoke(channel: 'app-db-offset-get-all'): Promise<AppDbOffsetGetAllResponse>;
    };
  }
}

export {};
