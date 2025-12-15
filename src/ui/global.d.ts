/**
 * 全局类型声明
 * 为 window.electron API 提供 TypeScript 类型支持
 */

import type { SearchResult, BilibiliVideo, AudioUrlResponse } from '../shared/types';
import type {
  NeteaseSearchResult,
  Playlist,
  PlaylistDetail,
  LocalFolder,
  LocalTrack,
  UpdateEventPayload,
  UpdateInfo,
} from './types';

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare global {

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

// 歌单 API 响应类型
interface AppDbPlaylistCreateResponse {
  success: boolean;
  id?: string;
  error?: string;
}

interface AppDbPlaylistGetAllResponse {
  success: boolean;
  data: Playlist[];
  error?: string;
}

interface AppDbPlaylistGetDetailResponse {
  success: boolean;
  data?: PlaylistDetail;
  error?: string;
}

interface AppDbPlaylistUpdateResponse {
  success: boolean;
  error?: string;
}

interface AppDbPlaylistDeleteResponse {
  success: boolean;
  error?: string;
}

interface AppDbPlaylistAddSongResponse {
  success: boolean;
  error?: string;
}

interface AppDbPlaylistRemoveSongsResponse {
  success: boolean;
  error?: string;
}

interface AppDbPlaylistReorderSongsResponse {
  success: boolean;
  error?: string;
}

// 歌单导出响应类型
interface AppDbPlaylistExportResponse {
  success: boolean;
  data?: {
    type: 'playlist';
    exportTime: number;
    count: number;
    playlist: {
      name: string;
      createTime: number;
      updateTime: number;
      songs: Array<{
        title: string;
        author: string;
        bvid: string;
        duration: string;
        cover: string;
        cid: number;
        pages: unknown[];
        play?: number;
      }>;
    };
  };
  error?: string;
}

// 歌单批量导出响应类型
interface AppDbPlaylistExportMultipleResponse {
  success: boolean;
  data?: {
    type: 'playlists';
    exportTime: number;
    count: number;
    playlists: Array<{
      name: string;
      createTime: number;
      updateTime: number;
      songs: Array<{
        title: string;
        author: string;
        bvid: string;
        duration: string;
        cover: string;
        cid: number;
        pages: unknown[];
        play?: number;
      }>;
    }>;
  };
  error?: string;
}

// 歌单预览导入响应类型
interface AppDbPlaylistPreviewImportResponse {
  success: boolean;
  playlists: Array<{ id: string; name: string; songCount: number }>;
  isMultiple: boolean;
  error?: string;
}

// 歌单导入响应类型
interface AppDbPlaylistImportResponse {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

// 搜索建议响应类型
type SearchSuggestionsResponse = string[];

// 本地音乐 IPC 响应类型
interface LocalMusicSelectFilesResponse {
  success: boolean;
  filePaths?: string[];
  canceled?: boolean;
  error?: string;
}

interface LocalMusicSelectFolderResponse {
  success: boolean;
  folderPath?: string;
  canceled?: boolean;
  error?: string;
}

interface LocalMusicScanFolderResponse {
  success: boolean;
  folderId?: string;
  folderName?: string;
  totalFiles?: number;
  successCount?: number;
  failedCount?: number;
  errors?: string[];
  error?: string;
}

interface LocalMusicAddFilesResponse {
  success: boolean;
  successCount?: number;
  failedCount?: number;
  errors?: string[];
  error?: string;
}

interface LocalMusicCreateFolderResponse {
  success: boolean;
  id?: string;
  error?: string;
}

interface LocalMusicGetFoldersResponse {
  success: boolean;
  data?: LocalFolder[];
  error?: string;
}

interface LocalMusicRenameFolderResponse {
  success: boolean;
  error?: string;
}

interface LocalMusicDeleteFolderResponse {
  success: boolean;
  error?: string;
}

interface LocalMusicGetTracksResponse {
  success: boolean;
  data?: LocalTrack[];
  error?: string;
}

interface LocalMusicDeleteTrackResponse {
  success: boolean;
  error?: string;
}

interface LocalMusicGetTrackByIdResponse {
  success: boolean;
  data?: LocalTrack | null;
  error?: string;
}

// 更新相关
interface AppVersionResponse {
  success: boolean;
  version: string;
  error?: string;
}

interface AppCheckUpdateResponse {
  success: boolean;
  currentVersion: string;
  updateAvailable?: boolean;
  updateInfo?: UpdateInfo;
  error?: string;
}

interface AppDownloadUpdateResponse {
  success: boolean;
  cancelled?: boolean;
  error?: string;
}

interface AppUpdateControlResponse {
  success: boolean;
  error?: string;
}

interface WindowControlResponse {
  success: boolean;
  isMaximized: boolean;
}

type WindowControlAction = 'minimize' | 'toggle-maximize' | 'close' | 'get-state';


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
      // 应用数据库 - 歌单
      invoke(channel: 'app-db-playlist-create', name: string, description?: string): Promise<AppDbPlaylistCreateResponse>;
      invoke(channel: 'app-db-playlist-get-all'): Promise<AppDbPlaylistGetAllResponse>;
      invoke(channel: 'app-db-playlist-get-detail', playlistId: string): Promise<AppDbPlaylistGetDetailResponse>;
      invoke(channel: 'app-db-playlist-update', playlistId: string, updates: {
        name?: string;
        description?: string;
        coverUrl?: string;
      }): Promise<AppDbPlaylistUpdateResponse>;
      invoke(channel: 'app-db-playlist-delete', playlistId: string): Promise<AppDbPlaylistDeleteResponse>;
      invoke(channel: 'app-db-playlist-add-song', playlistId: string, song: {
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
      }): Promise<AppDbPlaylistAddSongResponse>;
      invoke(channel: 'app-db-playlist-remove-songs', playlistId: string, songIds: string[]): Promise<AppDbPlaylistRemoveSongsResponse>;
      invoke(channel: 'app-db-playlist-reorder-songs', playlistId: string, songIds: string[]): Promise<AppDbPlaylistReorderSongsResponse>;
      invoke(channel: 'app-db-playlist-export', playlistId: string): Promise<AppDbPlaylistExportResponse>;
      invoke(channel: 'app-db-playlist-export-multiple', playlistIds: string[]): Promise<AppDbPlaylistExportMultipleResponse>;
      invoke(channel: 'app-db-playlist-preview-import', jsonData: string): Promise<AppDbPlaylistPreviewImportResponse>;
      invoke(channel: 'app-db-playlist-import', jsonData: string, selectedIds?: string[]): Promise<AppDbPlaylistImportResponse>;
      //这里没有注
      invoke(channel: 'local-music-select-files'): Promise<LocalMusicSelectFilesResponse>;
      invoke(channel: 'local-music-select-folder'): Promise<LocalMusicSelectFolderResponse>;
      invoke(channel: 'local-music-scan-folder', folderPath: string): Promise<LocalMusicScanFolderResponse>;
      invoke(channel: 'local-music-add-files', folderId: string, filePaths: string[]): Promise<LocalMusicAddFilesResponse>;
      invoke(channel: 'local-music-create-folder', name: string): Promise<LocalMusicCreateFolderResponse>;
      invoke(channel: 'local-music-get-folders'): Promise<LocalMusicGetFoldersResponse>;
      invoke(channel: 'local-music-rename-folder', folderId: string, newName: string): Promise<LocalMusicRenameFolderResponse>;
      invoke(channel: 'local-music-delete-folder', folderId: string): Promise<LocalMusicDeleteFolderResponse>;
      invoke(channel: 'local-music-get-tracks', folderId: string): Promise<LocalMusicGetTracksResponse>;
      invoke(channel: 'local-music-delete-track', trackId: string): Promise<LocalMusicDeleteTrackResponse>;
      invoke(channel: 'local-music-get-track-by-id', trackId: string): Promise<LocalMusicGetTrackByIdResponse>;
      invoke(channel: 'window-control', action: WindowControlAction): Promise<WindowControlResponse>;
      // 更新相关
      invoke(channel: 'app-get-version'): Promise<AppVersionResponse>;
      invoke(channel: 'app-check-update'): Promise<AppCheckUpdateResponse>;
      invoke(channel: 'app-download-update', options?: { resume?: boolean }): Promise<AppDownloadUpdateResponse>;
      invoke(channel: 'app-update-control', action: 'pause' | 'resume' | 'cancel'): Promise<AppUpdateControlResponse>;

      onUpdateEvent(callback: (event: UpdateEventPayload) => void): () => void;
    };
  }
}

export {};
