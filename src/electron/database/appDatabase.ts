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
