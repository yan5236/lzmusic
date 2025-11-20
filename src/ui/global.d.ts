/**
 * 全局类型声明
 * 为 window.electron API 提供 TypeScript 类型支持
 */

import type { SearchResult, BilibiliVideo, AudioUrlResponse } from '../shared/types';

declare global {
  interface Window {
    electron: {
      invoke(channel: 'search-videos', keyword: string, page: number): Promise<SearchResult>;
      invoke(channel: 'get-video-info', bvid: string): Promise<BilibiliVideo>;
      invoke(channel: 'is-bvid', input: string): Promise<boolean>;
      invoke(channel: 'get-audio-url', bvid: string, cid: number): Promise<AudioUrlResponse>;
    };
  }
}

export {};
