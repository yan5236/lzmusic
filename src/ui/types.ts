import type { ReactElement } from 'react';
import type { BilibiliPage } from '../shared/types';

/**
 * 歌曲信息接口
 */
export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string; // 改为可选,Bilibili 视频没有专辑概念
  coverUrl: string;
  duration: number; // in seconds
  lyrics?: string[]; // 改为可选,Bilibili 视频可能没有歌词

  // Bilibili 特有字段
  bvid?: string; // Bilibili 视频 ID
  cid?: number; // 视频分P的 CID
  pages?: BilibiliPage[]; // 分P信息列表
  source?: 'local' | 'bilibili'; // 来源标识
}

/**
 * 播放模式常量
 */
export const PlaybackMode = {
  LOOP: 'LOOP',
  SINGLE: 'SINGLE',
  SHUFFLE: 'SHUFFLE',
} as const;

export type PlaybackMode = typeof PlaybackMode[keyof typeof PlaybackMode];

/**
 * 播放器状态接口
 */
export interface PlayerState {
  isPlaying: boolean;
  currentSong: Song | null;
  currentTime: number;
  volume: number;
  isFullPlayerOpen: boolean;
  queue: Song[];
  showPlaylist: boolean;
  mode: PlaybackMode;
  history: Song[];
  lyricsFontSize: number; // 歌词字体大小(px)
  lyricsOffset: number; // 歌词时间偏移(ms)
}

/**
 * 视图状态常量
 */
export const ViewState = {
  HOME: 'HOME',
  SEARCH: 'SEARCH',
  PLAYLISTS: 'PLAYLISTS',
  HISTORY: 'HISTORY',
  LOCAL: 'LOCAL',
  SETTINGS: 'SETTINGS',
} as const;

export type ViewState = typeof ViewState[keyof typeof ViewState];

/**
 * 侧边栏项接口
 */
export interface SidebarItem {
  id: ViewState;
  label: string;
  icon: ReactElement;
}

/**
 * 网易云音乐搜索结果接口
 */
export interface NeteaseSearchResult {
  id: number;
  name: string;
  artist: string;
  album: string;
}