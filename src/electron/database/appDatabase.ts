/**
 * 应用数据库模块
 * 使用 better-sqlite3 存储应用数据（历史记录、歌词偏移等）
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// 历史记录数据结构（存储用）
export interface HistoryRecord {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  duration: number;
  bvid?: string;
  cid?: number;
  pages?: string; // JSON 序列化的分P信息
  source?: 'local' | 'bilibili';
  playedAt: number; // 播放时间戳
}

// 歌词偏移数据结构
export interface LyricsOffsetRecord {
  songId: string; // 歌曲唯一标识
  offset: number; // 偏移量（毫秒）
  updatedAt: number; // 更新时间戳
}

// 歌单数据结构
export interface PlaylistRecord {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  createdAt: number;
  updatedAt: number;
}

// 歌单歌曲关联数据结构
export interface PlaylistSongRecord {
  playlistId: string;
  songId: string;
  songData: string; // JSON 序列化的歌曲完整信息
  sortOrder: number;
  addedAt: number;
}

// 导出歌曲数据结构（兼容旧版格式）
export interface ExportSongData {
  title: string;
  author: string;
  bvid: string;
  duration: string; // "分:秒" 格式
  cover: string;
  cid: number;
  pages: Array<{
    cid: number;
    page: number;
    from: string;
    part: string;
    duration: number;
    vid: string;
    weblink: string;
    dimension?: { width: number; height: number; rotate: number };
    first_frame?: string;
    ctime?: number;
  }>;
  play?: number;
}

// 导出单个歌单数据结构（兼容旧版格式）
export interface ExportPlaylistData {
  type: 'playlist';
  exportTime: number;
  count: number;
  playlist: {
    name: string;
    createTime: number;
    updateTime: number;
    songs: ExportSongData[];
  };
}

// 导出多个歌单数据结构
export interface ExportMultiplePlaylistsData {
  type: 'playlists';
  exportTime: number;
  count: number;
  playlists: ExportPlaylistData['playlist'][];
}

// 导入结果
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

// 本地歌曲虚拟文件夹数据结构
export interface LocalFolderRecord {
  id: string;
  name: string;
  created_at: number;
}

// 本地歌曲数据结构
export interface LocalTrackRecord {
  id: string;
  folder_id: string;
  file_path: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  cover_path?: string;
  created_at: number;
}

class AppDatabase {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor() {
    // 数据库文件存储在用户数据目录
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'app.db');
  }

  /**
   * 初始化数据库连接和表结构
   */
  public initialize(): void {
    try {
      this.db = new Database(this.dbPath);

      // 创建历史记录表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          album TEXT,
          coverUrl TEXT NOT NULL,
          duration REAL NOT NULL,
          bvid TEXT,
          cid INTEGER,
          pages TEXT,
          source TEXT,
          playedAt INTEGER NOT NULL
        )
      `);

      // 创建歌词偏移表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS lyrics_offset (
          songId TEXT PRIMARY KEY,
          offset INTEGER NOT NULL DEFAULT 0,
          updatedAt INTEGER NOT NULL
        )
      `);

      // 创建歌单表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS playlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          coverUrl TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);

      // 创建歌单歌曲关联表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS playlist_songs (
          playlistId TEXT NOT NULL,
          songId TEXT NOT NULL,
          songData TEXT NOT NULL,
          sortOrder INTEGER NOT NULL,
          addedAt INTEGER NOT NULL,
          PRIMARY KEY (playlistId, songId)
        )
      `);

      // 为歌单歌曲表创建索引以优化查询
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlistId
        ON playlist_songs(playlistId, sortOrder)
      `);

      // 创建本地歌曲虚拟文件夹表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS local_folders (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);

      // 创建本地歌曲表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS local_tracks (
          id TEXT PRIMARY KEY,
          folder_id TEXT NOT NULL,
          file_path TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          album TEXT,
          duration REAL NOT NULL,
          cover_path TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (folder_id) REFERENCES local_folders(id) ON DELETE CASCADE
        )
      `);

      // 为本地歌曲表创建索引以优化查询
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_local_tracks_folder
        ON local_tracks(folder_id, created_at)
      `);

      console.log('应用数据库初始化成功:', this.dbPath);
    } catch (error) {
      console.error('应用数据库初始化失败:', error);
      throw error;
    }
  }

  // ========== 历史记录操作 ==========

  /**
   * 添加或更新历史记录
   * 如果歌曲已存在，更新播放时间
   * @param song - 歌曲信息
   */
  public addHistory(song: Omit<HistoryRecord, 'playedAt'>): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const playedAt = Date.now();
      const pagesJson = song.pages ? song.pages : null;

      // 使用 REPLACE 实现插入或更新
      const stmt = this.db.prepare(`
        REPLACE INTO history (id, title, artist, album, coverUrl, duration, bvid, cid, pages, source, playedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        song.id,
        song.title,
        song.artist,
        song.album || null,
        song.coverUrl,
        song.duration,
        song.bvid || null,
        song.cid || null,
        pagesJson,
        song.source || null,
        playedAt
      );

      // 保持历史记录最多50条
      this.db.exec(`
        DELETE FROM history WHERE id NOT IN (
          SELECT id FROM history ORDER BY playedAt DESC LIMIT 50
        )
      `);

      console.log(`历史记录已添加 [ID: ${song.id}]`);
    } catch (error) {
      console.error('添加历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有历史记录
   * @returns 历史记录数组，按播放时间倒序
   */
  public getHistory(): HistoryRecord[] {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM history ORDER BY playedAt DESC LIMIT 50');
      const rows = stmt.all() as HistoryRecord[];
      return rows;
    } catch (error) {
      console.error('获取历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 清空历史记录
   */
  public clearHistory(): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      this.db.exec('DELETE FROM history');
      console.log('历史记录已清空');
    } catch (error) {
      console.error('清空历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 删除单条历史记录
   * @param id - 歌曲ID
   */
  public deleteHistory(id: string): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM history WHERE id = ?');
      stmt.run(id);
      console.log(`历史记录已删除 [ID: ${id}]`);
    } catch (error) {
      console.error('删除历史记录失败:', error);
      throw error;
    }
  }

  // ========== 歌词偏移操作 ==========

  /**
   * 保存歌词偏移
   * @param songId - 歌曲唯一标识
   * @param offset - 偏移量（毫秒）
   */
  public saveLyricsOffset(songId: string, offset: number): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const updatedAt = Date.now();
      const stmt = this.db.prepare(`
        REPLACE INTO lyrics_offset (songId, offset, updatedAt)
        VALUES (?, ?, ?)
      `);
      stmt.run(songId, offset, updatedAt);
      console.log(`歌词偏移已保存 [ID: ${songId}, 偏移: ${offset}ms]`);
    } catch (error) {
      console.error('保存歌词偏移失败:', error);
      throw error;
    }
  }

  /**
   * 获取歌词偏移
   * @param songId - 歌曲唯一标识
   * @returns 偏移量（毫秒），如果不存在返回 0
   */
  public getLyricsOffset(songId: string): number {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT offset FROM lyrics_offset WHERE songId = ?');
      const row = stmt.get(songId) as { offset: number } | undefined;
      return row ? row.offset : 0;
    } catch (error) {
      console.error('获取歌词偏移失败:', error);
      throw error;
    }
  }

  /**
   * 删除歌词偏移
   * @param songId - 歌曲唯一标识
   */
  public deleteLyricsOffset(songId: string): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM lyrics_offset WHERE songId = ?');
      stmt.run(songId);
      console.log(`歌词偏移已删除 [ID: ${songId}]`);
    } catch (error) {
      console.error('删除歌词偏移失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有歌词偏移设置
   * @returns 歌词偏移记录数组
   */
  public getAllLyricsOffsets(): LyricsOffsetRecord[] {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM lyrics_offset ORDER BY updatedAt DESC');
      return stmt.all() as LyricsOffsetRecord[];
    } catch (error) {
      console.error('获取所有歌词偏移失败:', error);
      throw error;
    }
  }

  // ========== 歌单操作 ==========

  /**
   * 创建歌单
   * @param playlist - 歌单信息（不含id）
   * @returns 创建的歌单ID
   */
  public createPlaylist(playlist: Omit<PlaylistRecord, 'id' | 'createdAt' | 'updatedAt'>): string {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const id = `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const stmt = this.db.prepare(`
        INSERT INTO playlists (id, name, description, coverUrl, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        playlist.name,
        playlist.description || null,
        playlist.coverUrl || null,
        now,
        now
      );

      console.log(`歌单已创建 [ID: ${id}, 名称: ${playlist.name}]`);
      return id;
    } catch (error) {
      console.error('创建歌单失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有歌单（包含歌曲数量）
   * 当歌单没有自定义封面时，使用第一首歌曲的封面
   * @returns 歌单数组
   */
  public getAllPlaylists(): (PlaylistRecord & { songCount: number })[] {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      // 使用子查询获取每个歌单的第一首歌曲封面
      const stmt = this.db.prepare(`
        SELECT
          p.*,
          COUNT(ps.songId) as songCount,
          (
            SELECT JSON_EXTRACT(ps2.songData, '$.coverUrl')
            FROM playlist_songs ps2
            WHERE ps2.playlistId = p.id
            ORDER BY ps2.sortOrder ASC
            LIMIT 1
          ) as firstSongCover
        FROM playlists p
        LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
        GROUP BY p.id
        ORDER BY p.updatedAt DESC
      `);

      const playlists = stmt.all() as (PlaylistRecord & { songCount: number; firstSongCover?: string })[];

      // 如果歌单没有自定义封面，使用第一首歌曲的封面
      return playlists.map(playlist => ({
        ...playlist,
        coverUrl: playlist.coverUrl || playlist.firstSongCover || undefined,
      }));
    } catch (error) {
      console.error('获取歌单列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取歌单详情（包含歌曲列表）
   * @param playlistId - 歌单ID
   * @returns 歌单详情及歌曲列表
   */
  public getPlaylistDetail(playlistId: string): {
    playlist: PlaylistRecord & { songCount: number };
    songs: (HistoryRecord & { sortOrder: number; addedAt: number })[];
  } | null {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      // 获取歌单基本信息
      const playlistStmt = this.db.prepare(`
        SELECT
          p.*,
          COUNT(ps.songId) as songCount
        FROM playlists p
        LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
        WHERE p.id = ?
        GROUP BY p.id
      `);

      const playlist = playlistStmt.get(playlistId) as (PlaylistRecord & { songCount: number }) | undefined;

      if (!playlist) {
        return null;
      }

      // 获取歌单中的歌曲列表
      const songsStmt = this.db.prepare(`
        SELECT songData, sortOrder, addedAt
        FROM playlist_songs
        WHERE playlistId = ?
        ORDER BY sortOrder ASC
      `);

      const songRecords = songsStmt.all(playlistId) as {
        songData: string;
        sortOrder: number;
        addedAt: number;
      }[];

      const songs = songRecords.map(record => ({
        ...JSON.parse(record.songData),
        sortOrder: record.sortOrder,
        addedAt: record.addedAt
      }));

      return { playlist, songs };
    } catch (error) {
      console.error('获取歌单详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新歌单信息
   * @param playlistId - 歌单ID
   * @param updates - 要更新的字段
   */
  public updatePlaylist(
    playlistId: string,
    updates: Partial<Pick<PlaylistRecord, 'name' | 'description' | 'coverUrl'>>
  ): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const updatedAt = Date.now();
      const fields: string[] = [];
      const values: (string | number)[] = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description || '');
      }
      if (updates.coverUrl !== undefined) {
        fields.push('coverUrl = ?');
        values.push(updates.coverUrl || '');
      }

      if (fields.length === 0) {
        return; // 没有需要更新的字段
      }

      fields.push('updatedAt = ?');
      values.push(updatedAt, playlistId);

      const stmt = this.db.prepare(`
        UPDATE playlists
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);
      console.log(`歌单已更新 [ID: ${playlistId}]`);
    } catch (error) {
      console.error('更新歌单失败:', error);
      throw error;
    }
  }

  /**
   * 删除歌单（及其所有歌曲）
   * @param playlistId - 歌单ID
   */
  public deletePlaylist(playlistId: string): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      // 先删除歌单中的所有歌曲
      const deleteSongsStmt = this.db.prepare('DELETE FROM playlist_songs WHERE playlistId = ?');
      deleteSongsStmt.run(playlistId);

      // 再删除歌单
      const deletePlaylistStmt = this.db.prepare('DELETE FROM playlists WHERE id = ?');
      deletePlaylistStmt.run(playlistId);

      console.log(`歌单已删除 [ID: ${playlistId}]`);
    } catch (error) {
      console.error('删除歌单失败:', error);
      throw error;
    }
  }

  /**
   * 添加歌曲到歌单
   * @param playlistId - 歌单ID
   * @param song - 歌曲信息
   */
  public addSongToPlaylist(playlistId: string, song: HistoryRecord): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      // 检查歌曲是否已存在
      const checkStmt = this.db.prepare(`
        SELECT songId FROM playlist_songs
        WHERE playlistId = ? AND songId = ?
      `);
      const exists = checkStmt.get(playlistId, song.id);

      if (exists) {
        console.log(`歌曲已存在于歌单中 [歌单: ${playlistId}, 歌曲: ${song.id}]`);
        return; // 歌曲已存在，不重复添加
      }

      // 获取当前最大的 sortOrder
      const maxOrderStmt = this.db.prepare(`
        SELECT MAX(sortOrder) as maxOrder
        FROM playlist_songs
        WHERE playlistId = ?
      `);
      const result = maxOrderStmt.get(playlistId) as { maxOrder: number | null };
      const sortOrder = (result.maxOrder ?? -1) + 1;

      const addedAt = Date.now();
      const songData = JSON.stringify(song);

      const stmt = this.db.prepare(`
        INSERT INTO playlist_songs (playlistId, songId, songData, sortOrder, addedAt)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(playlistId, song.id, songData, sortOrder, addedAt);

      // 更新歌单的 updatedAt
      this.db.prepare('UPDATE playlists SET updatedAt = ? WHERE id = ?').run(Date.now(), playlistId);

      console.log(`歌曲已添加到歌单 [歌单: ${playlistId}, 歌曲: ${song.id}]`);
    } catch (error) {
      console.error('添加歌曲到歌单失败:', error);
      throw error;
    }
  }

  /**
   * 从歌单中批量删除歌曲
   * @param playlistId - 歌单ID
   * @param songIds - 歌曲ID数组
   */
  public removeSongsFromPlaylist(playlistId: string, songIds: string[]): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const placeholders = songIds.map(() => '?').join(',');
      const stmt = this.db.prepare(`
        DELETE FROM playlist_songs
        WHERE playlistId = ? AND songId IN (${placeholders})
      `);

      stmt.run(playlistId, ...songIds);

      // 重新排序剩余歌曲
      this.reorderPlaylistSongs(playlistId);

      // 更新歌单的 updatedAt
      this.db.prepare('UPDATE playlists SET updatedAt = ? WHERE id = ?').run(Date.now(), playlistId);

      console.log(`已从歌单删除 ${songIds.length} 首歌曲 [歌单: ${playlistId}]`);
    } catch (error) {
      console.error('从歌单删除歌曲失败:', error);
      throw error;
    }
  }

  /**
   * 重新排序歌单中的歌曲
   * @param playlistId - 歌单ID
   * @param songIds - 按新顺序排列的歌曲ID数组
   */
  public reorderPlaylistSongs(playlistId: string, songIds?: string[]): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      if (songIds) {
        // 如果提供了新顺序，按照新顺序更新
        const updateStmt = this.db.prepare(`
          UPDATE playlist_songs
          SET sortOrder = ?
          WHERE playlistId = ? AND songId = ?
        `);

        songIds.forEach((songId, index) => {
          updateStmt.run(index, playlistId, songId);
        });
      } else {
        // 如果没有提供新顺序，重新整理现有顺序（用于删除后）
        const songs = this.db.prepare(`
          SELECT songId FROM playlist_songs
          WHERE playlistId = ?
          ORDER BY sortOrder ASC
        `).all(playlistId) as { songId: string }[];

        const updateStmt = this.db.prepare(`
          UPDATE playlist_songs
          SET sortOrder = ?
          WHERE playlistId = ? AND songId = ?
        `);

        songs.forEach((song, index) => {
          updateStmt.run(index, playlistId, song.songId);
        });
      }

      // 更新歌单的 updatedAt
      this.db.prepare('UPDATE playlists SET updatedAt = ? WHERE id = ?').run(Date.now(), playlistId);

      console.log(`歌单歌曲顺序已更新 [歌单: ${playlistId}]`);
    } catch (error) {
      console.error('重新排序歌单歌曲失败:', error);
      throw error;
    }
  }

  // ========== 歌单导出导入操作 ==========

  /**
   * 导出单个歌单数据（兼容旧版格式）
   * @param playlistId - 歌单ID
   * @returns 导出数据，如果歌单不存在返回null
   */
  public exportPlaylistData(playlistId: string): ExportPlaylistData | null {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const detail = this.getPlaylistDetail(playlistId);
      if (!detail) {
        return null;
      }

      // 将歌曲数据转换为导出格式，过滤掉本地歌曲（本地歌曲没有bvid，无法在其他软件使用）
      const songs: ExportSongData[] = detail.songs
        .filter(song => song.source !== 'local')
        .map(song => ({
          title: song.title,
          author: song.artist,
          bvid: song.bvid || '',
          duration: this.formatDuration(song.duration),
          cover: song.coverUrl,
          cid: song.cid || 0,
          pages: song.pages ? JSON.parse(song.pages as unknown as string) : [],
          play: 0,
        }));

      return {
        type: 'playlist',
        exportTime: Date.now(),
        count: songs.length,
        playlist: {
          name: detail.playlist.name,
          createTime: detail.playlist.createdAt,
          updateTime: detail.playlist.updatedAt,
          songs,
        },
      };
    } catch (error) {
      console.error('导出歌单失败:', error);
      throw error;
    }
  }

  /**
   * 批量导出多个歌单
   * @param playlistIds - 歌单ID数组
   * @returns 多歌单导出数据
   */
  public exportMultiplePlaylists(playlistIds: string[]): ExportMultiplePlaylistsData {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const playlists: ExportPlaylistData['playlist'][] = [];

      for (const id of playlistIds) {
        const exportData = this.exportPlaylistData(id);
        if (exportData) {
          playlists.push(exportData.playlist);
        }
      }

      return {
        type: 'playlists',
        exportTime: Date.now(),
        count: playlists.length,
        playlists,
      };
    } catch (error) {
      console.error('批量导出歌单失败:', error);
      throw error;
    }
  }

  /**
   * 从导出数据导入歌单
   * 支持旧版单歌单格式和新版多歌单格式
   * @param data - 导出的JSON数据字符串
   * @param selectedIds - 可选，要导入的歌单ID列表（用于选择性导入）
   * @returns 导入结果
   */
  public importPlaylistData(data: string, selectedIds?: string[]): ImportResult {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const parsed = JSON.parse(data);
      const results: ImportResult = {
        success: true,
        imported: 0,
        failed: 0,
        errors: [],
      };

      // 判断是单歌单还是多歌单格式
      if (parsed.type === 'playlist' && parsed.playlist) {
        // 旧版单歌单格式
        // 使用索引作为临时ID，与预览时一致
        const playlistId = 'import-index-0';
        if (!selectedIds || selectedIds.includes(playlistId)) {
          this.importSinglePlaylist(parsed.playlist, results);
        }
      } else if (parsed.type === 'playlists' && Array.isArray(parsed.playlists)) {
        // 新版多歌单格式
        for (let i = 0; i < parsed.playlists.length; i++) {
          const playlist = parsed.playlists[i];
          // 使用索引作为临时ID，与预览时一致
          const playlistId = `import-index-${i}`;
          // 如果有选择列表，只导入选中的歌单
          if (!selectedIds || selectedIds.includes(playlistId)) {
            this.importSinglePlaylist(playlist, results);
          }
        }
      } else {
        results.success = false;
        results.errors.push('无法识别的导入格式');
      }

      return results;
    } catch (error) {
      console.error('导入歌单失败:', error);
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : '解析JSON失败'],
      };
    }
  }

  /**
   * 导入单个歌单
   * @param playlistData - 歌单数据
   * @param results - 导入结果对象（用于累计）
   */
  private importSinglePlaylist(
    playlistData: ExportPlaylistData['playlist'],
    results: ImportResult
  ): void {
    try {
      // 使用时间戳+随机数生成唯一ID，避免多个歌单ID冲突
      const playlistId = `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      // 创建歌单
      const stmt = this.db!.prepare(`
        INSERT INTO playlists (id, name, description, coverUrl, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        playlistId,
        playlistData.name,
        null,
        null,
        playlistData.createTime || now,
        playlistData.updateTime || now
      );

      // 导入歌曲
      if (playlistData.songs && playlistData.songs.length > 0) {
        const songStmt = this.db!.prepare(`
          INSERT INTO playlist_songs (playlistId, songId, songData, sortOrder, addedAt)
          VALUES (?, ?, ?, ?, ?)
        `);

        playlistData.songs.forEach((song, index) => {
          // 构建歌曲数据，转换为内部格式
          const songRecord: HistoryRecord = {
            id: song.bvid ? `bilibili_${song.bvid}_${song.cid || 0}` : `song_${Date.now()}_${index}`,
            title: song.title,
            artist: song.author,
            coverUrl: song.cover,
            duration: this.parseDuration(song.duration),
            bvid: song.bvid,
            cid: song.cid,
            pages: song.pages ? JSON.stringify(song.pages) : undefined,
            source: 'bilibili',
            playedAt: now,
          };

          songStmt.run(
            playlistId,
            songRecord.id,
            JSON.stringify(songRecord),
            index,
            now
          );
        });
      }

      results.imported++;
      console.log(`歌单导入成功 [名称: ${playlistData.name}, 歌曲数: ${playlistData.songs?.length || 0}]`);
    } catch (error) {
      results.failed++;
      results.errors.push(`导入歌单"${playlistData.name}"失败: ${error instanceof Error ? error.message : '未知错误'}`);
      console.error(`导入歌单失败 [名称: ${playlistData.name}]:`, error);
    }
  }

  /**
   * 将秒数格式化为 "分:秒" 格式
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs}`;
  }

  /**
   * 将 "分:秒" 格式解析为秒数
   */
  private parseDuration(duration: string): number {
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  }

  // ========== 本地歌曲虚拟文件夹操作 ==========

  /**
   * 创建虚拟文件夹
   * @param name - 文件夹名称
   * @returns 创建的文件夹ID
   */
  public createLocalFolder(name: string): string {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const id = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const created_at = Date.now();

      const stmt = this.db.prepare(`
        INSERT INTO local_folders (id, name, created_at)
        VALUES (?, ?, ?)
      `);

      stmt.run(id, name, created_at);
      console.log(`虚拟文件夹已创建 [ID: ${id}, 名称: ${name}]`);
      return id;
    } catch (error) {
      console.error('创建虚拟文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有虚拟文件夹（包含歌曲数量）
   * @returns 文件夹数组
   */
  public getAllLocalFolders(): (LocalFolderRecord & { trackCount: number })[] {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT
          f.*,
          COUNT(t.id) as trackCount
        FROM local_folders f
        LEFT JOIN local_tracks t ON f.id = t.folder_id
        GROUP BY f.id
        ORDER BY f.created_at DESC
      `);

      return stmt.all() as (LocalFolderRecord & { trackCount: number })[];
    } catch (error) {
      console.error('获取虚拟文件夹列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定文件夹的所有歌曲
   * @param folderId - 文件夹ID
   * @returns 歌曲数组
   */
  public getLocalTracks(folderId: string): LocalTrackRecord[] {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM local_tracks
        WHERE folder_id = ?
        ORDER BY created_at ASC
      `);

      return stmt.all(folderId) as LocalTrackRecord[];
    } catch (error) {
      console.error('获取本地歌曲列表失败:', error);
      throw error;
    }
  }

  /**
   * 添加本地歌曲到文件夹
   * @param folderId - 文件夹ID
   * @param track - 歌曲信息（不含id和created_at）
   * @returns 创建的歌曲ID
   */
  public addLocalTrack(
    folderId: string,
    track: Omit<LocalTrackRecord, 'id' | 'folder_id' | 'created_at'>
  ): string {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      // 检查文件路径是否已存在
      const checkStmt = this.db.prepare('SELECT id FROM local_tracks WHERE file_path = ?');
      const existing = checkStmt.get(track.file_path) as { id: string } | undefined;

      if (existing) {
        console.log(`歌曲已存在 [路径: ${track.file_path}]`);
        return existing.id;
      }

      const id = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const created_at = Date.now();

      const stmt = this.db.prepare(`
        INSERT INTO local_tracks (id, folder_id, file_path, title, artist, album, duration, cover_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        folderId,
        track.file_path,
        track.title,
        track.artist,
        track.album || null,
        track.duration,
        track.cover_path || null,
        created_at
      );

      console.log(`本地歌曲已添加 [ID: ${id}, 标题: ${track.title}]`);
      return id;
    } catch (error) {
      console.error('添加本地歌曲失败:', error);
      throw error;
    }
  }

  /**
   * 删除虚拟文件夹（级联删除其中的歌曲）
   * @param folderId - 文件夹ID
   */
  public deleteLocalFolder(folderId: string): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      // 先删除文件夹中的所有歌曲
      const deleteTracksStmt = this.db.prepare('DELETE FROM local_tracks WHERE folder_id = ?');
      deleteTracksStmt.run(folderId);

      // 再删除文件夹
      const deleteFolderStmt = this.db.prepare('DELETE FROM local_folders WHERE id = ?');
      deleteFolderStmt.run(folderId);

      console.log(`虚拟文件夹已删除 [ID: ${folderId}]`);
    } catch (error) {
      console.error('删除虚拟文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 重命名虚拟文件夹
   * @param folderId - 文件夹ID
   * @param newName - 新名称
   */
  public renameLocalFolder(folderId: string, newName: string): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('UPDATE local_folders SET name = ? WHERE id = ?');
      stmt.run(newName, folderId);
      console.log(`虚拟文件夹已重命名 [ID: ${folderId}, 新名称: ${newName}]`);
    } catch (error) {
      console.error('重命名虚拟文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 删除本地歌曲
   * @param trackId - 歌曲ID
   */
  public deleteLocalTrack(trackId: string): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM local_tracks WHERE id = ?');
      stmt.run(trackId);
      console.log(`本地歌曲已删除 [ID: ${trackId}]`);
    } catch (error) {
      console.error('删除本地歌曲失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取本地歌曲
   * @param trackId - 歌曲ID
   * @returns 歌曲信息，如果不存在返回null
   */
  public getLocalTrackById(trackId: string): LocalTrackRecord | null {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM local_tracks WHERE id = ?');
      const track = stmt.get(trackId) as LocalTrackRecord | undefined;
      return track || null;
    } catch (error) {
      console.error('获取本地歌曲失败:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('应用数据库连接已关闭');
    }
  }
}

// 导出单例实例
export const appDatabase = new AppDatabase();
