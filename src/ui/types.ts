import type { ReactElement } from 'react';

/**
 * 歌曲信息接口
 */
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number; // in seconds
  lyrics: string[];
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