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
  coverStyle: 'normal' | 'vinyl'; // 播放界面封面样式
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

/**
 * 歌单基本信息接口
 */
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  createdAt: number;
  updatedAt: number;
  songCount: number; // 歌曲数量
}

/**
 * 歌单中的歌曲接口（包含排序和添加时间信息）
 */
export interface PlaylistSong extends Song {
  sortOrder: number; // 在歌单中的排序
  addedAt: number; // 添加到歌单的时间戳
}

/**
 * 歌单详情接口（含歌曲列表）
 */
export interface PlaylistDetail {
  playlist: Playlist;
  songs: PlaylistSong[];
}

/**
 * 本地歌曲虚拟文件夹接口
 */
export interface LocalFolder {
  id: string;
  name: string;
  created_at: number;
  trackCount: number; // 文件夹内歌曲数量
}

/**
 * 本地歌曲接口
 */
export interface LocalTrack {
  id: string;
  folder_id: string;
  file_path: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // 秒
  cover_path?: string;
  created_at: number;
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  notes?: string;
}

export interface UpdateProgress {
  percent: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
}

export type UpdateDownloadState = 'idle' | 'downloading' | 'paused' | 'completed' | 'error';

export type UpdateEventPayload =
  | { type: 'download-started' | 'download-resumed' }
  | { type: 'download-progress'; progress: UpdateProgress }
  | { type: 'download-paused' }
  | { type: 'download-cancelled' }
  | { type: 'update-downloaded'; info?: UpdateInfo }
  | { type: 'update-error'; message: string };
