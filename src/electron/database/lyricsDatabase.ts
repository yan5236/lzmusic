/**
 * 歌词数据库模块
 * 使用 better-sqlite3 存储歌词数据
 * 支持基于 BV号 或本地歌曲ID 的歌词存储和检索
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// 歌词数据结构
export interface LyricsRecord {
  id: string;              // 唯一标识：B站视频用bvid，本地歌曲用文件路径或自定义ID
  lyrics: string;          // JSON序列化的歌词数组
  source: 'bilibili' | 'local' | 'netease'; // 歌词来源
  updatedAt: number;       // 更新时间戳
}

class LyricsDatabase {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor() {
    // 数据库文件存储在用户数据目录
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'lyrics.db');
  }

  /**
   * 初始化数据库连接和表结构
   */
  public initialize(): void {
    try {
      this.db = new Database(this.dbPath);

      // 创建歌词表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS lyrics (
          id TEXT PRIMARY KEY,
          lyrics TEXT NOT NULL,
          source TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);

      console.log('歌词数据库初始化成功:', this.dbPath);
    } catch (error) {
      console.error('歌词数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 保存或更新歌词
   * 如果已存在相同ID的记录，则覆盖
   * @param id - 歌曲唯一标识（BV号或本地歌曲ID）
   * @param lyrics - 歌词数组
   * @param source - 歌词来源
   */
  public saveLyrics(
    id: string,
    lyrics: string[],
    source: 'bilibili' | 'local' | 'netease' = 'bilibili'
  ): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const lyricsJson = JSON.stringify(lyrics);
      const updatedAt = Date.now();

      // 使用 REPLACE 实现插入或更新
      const stmt = this.db.prepare(`
        REPLACE INTO lyrics (id, lyrics, source, updatedAt)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(id, lyricsJson, source, updatedAt);

      console.log(`歌词已保存 [ID: ${id}, 来源: ${source}]`);
    } catch (error) {
      console.error('保存歌词失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取歌词
   * @param id - 歌曲唯一标识
   * @returns 歌词数组，如果不存在返回 null
   */
  public getLyrics(id: string): string[] | null {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT lyrics FROM lyrics WHERE id = ?');
      const row = stmt.get(id) as { lyrics: string } | undefined;

      if (row) {
        return JSON.parse(row.lyrics) as string[];
      }

      return null;
    } catch (error) {
      console.error('获取歌词失败:', error);
      throw error;
    }
  }

  /**
   * 检查歌词是否存在
   * @param id - 歌曲唯一标识
   * @returns 是否存在歌词记录
   */
  public hasLyrics(id: string): boolean {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM lyrics WHERE id = ?');
      const row = stmt.get(id) as { count: number };
      return row.count > 0;
    } catch (error) {
      console.error('检查歌词是否存在失败:', error);
      throw error;
    }
  }

  /**
   * 删除指定ID的歌词
   * @param id - 歌曲唯一标识
   */
  public deleteLyrics(id: string): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM lyrics WHERE id = ?');
      stmt.run(id);
      console.log(`歌词已删除 [ID: ${id}]`);
    } catch (error) {
      console.error('删除歌词失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有歌词记录
   * @returns 所有歌词记录数组
   */
  public getAllLyrics(): LyricsRecord[] {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM lyrics ORDER BY updatedAt DESC');
      const rows = stmt.all() as Array<{
        id: string;
        lyrics: string;
        source: string;
        updatedAt: number;
      }>;

      return rows.map(row => ({
        id: row.id,
        lyrics: row.lyrics,
        source: row.source as 'bilibili' | 'local' | 'netease',
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      console.error('获取所有歌词失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有歌词记录
   */
  public clearAll(): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      this.db.exec('DELETE FROM lyrics');
      console.log('所有歌词记录已清空');
    } catch (error) {
      console.error('清空歌词失败:', error);
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
      console.log('歌词数据库连接已关闭');
    }
  }
}

// 导出单例实例
export const lyricsDatabase = new LyricsDatabase();
