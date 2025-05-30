// 歌词数据库管理类
class LyricsDB {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.init();
  }

  // 初始化数据库
  async init() {
    try {
      // 确保数据目录存在
      await this.ensureDataDirectory();
      
      // 设置数据库文件路径
      this.dbPath = await window.electronAPI.path.join('data', 'lyrics.db');
      
      // 使用IPC调用主进程来初始化数据库
      const result = await window.electronAPI.lyricsDB.init(this.dbPath);
      
      if (result.success) {
        console.log('歌词数据库初始化成功:', this.dbPath);
        this.db = true; // 标记数据库已初始化
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('歌词数据库初始化失败:', error);
    }
  }

  // 确保数据目录存在
  async ensureDataDirectory() {
    try {
      // 这个由主进程处理，无需在渲染进程中操作文件系统
      console.log('数据目录检查将由主进程处理');
    } catch (error) {
      console.warn('数据目录检查失败:', error);
    }
  }

  // 生成歌曲键值（用于唯一标识歌曲）
  generateSongKey(title, artist) {
    const cleanTitle = this.cleanString(title);
    const cleanArtist = this.cleanString(artist);
    return `${cleanTitle}_${cleanArtist}`.toLowerCase();
  }

  // 清理字符串（移除特殊字符和多余空格）
  cleanString(str) {
    if (!str) return '';
    return str
      .replace(/[\(\)（）\[\]【】\-\—\|｜]/g, ' ') // 移除括号和分隔符
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim();
  }

  // 保存歌词
  async saveLyrics(title, artist, lyricsData) {
    if (!this.db) {
      await this.init();
    }

    try {
      const songKey = this.generateSongKey(title, artist);
      const id = `${songKey}_${Date.now()}`;
      
      const lyricsRecord = {
        id: id,
        songKey: songKey,
        title: title,
        artist: artist,
        lyrics: lyricsData.lyrics,
        translation: lyricsData.translation || null,
        romaLyrics: lyricsData.romaLyrics || null,
        platform: lyricsData.platform || 'manual',
        platformName: lyricsData.platformName || '手动输入',
        quality: lyricsData.quality || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await window.electronAPI.lyricsDB.saveLyrics(lyricsRecord);
      
      if (result.success) {
        console.log('歌词保存成功:', title, '-', artist);
        return lyricsRecord;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('保存歌词失败:', error);
      throw error;
    }
  }

  // 获取歌词
  async getLyrics(title, artist) {
    if (!this.db) {
      await this.init();
    }

    try {
      const songKey = this.generateSongKey(title, artist);
      
      const result = await window.electronAPI.lyricsDB.getLyrics(songKey);
      
      if (result.success && result.data) {
        console.log('找到歌词:', title, '-', artist, '来源:', result.data.platformName);
        return result.data;
      } else {
        console.log('未找到歌词:', title, '-', artist);
        return null;
      }
    } catch (error) {
      console.error('获取歌词失败:', error);
      return null;
    }
  }

  // 获取歌曲的所有歌词版本
  async getAllLyricsVersions(title, artist) {
    if (!this.db) {
      await this.init();
    }

    try {
      const songKey = this.generateSongKey(title, artist);
      
      const result = await window.electronAPI.lyricsDB.getAllLyricsVersions(songKey);
      
      if (result.success) {
        console.log(`找到${result.data.length}个歌词版本:`, title, '-', artist);
        return result.data;
      } else {
        console.error('查询歌词版本失败:', result.error);
        return [];
      }
    } catch (error) {
      console.error('获取歌词版本失败:', error);
      return [];
    }
  }

  // 删除歌词
  async deleteLyrics(lyricsId) {
    if (!this.db) {
      await this.init();
    }

    try {
      const result = await window.electronAPI.lyricsDB.deleteLyrics(lyricsId);
      
      if (result.success) {
        console.log('歌词删除成功:', lyricsId);
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('删除歌词失败:', error);
      throw error;
    }
  }

  // 更新歌词
  async updateLyrics(lyricsId, updateData) {
    if (!this.db) {
      await this.init();
    }

    try {
      updateData.updatedAt = new Date().toISOString();
      
      const result = await window.electronAPI.lyricsDB.updateLyrics(lyricsId, updateData);
      
      if (result.success) {
        console.log('歌词更新成功:', lyricsId);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('更新歌词失败:', error);
      throw error;
    }
  }

  // 清空数据库
  async clearDatabase() {
    if (!this.db) {
      await this.init();
    }

    try {
      const result = await window.electronAPI.lyricsDB.clearDatabase();
      
      if (result.success) {
        console.log('歌词数据库已清空');
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('清空数据库失败:', error);
      throw error;
    }
  }

  // 获取数据库统计信息
  async getStats() {
    if (!this.db) {
      await this.init();
    }

    try {
      const result = await window.electronAPI.lyricsDB.getStats();
      
      if (result.success) {
        return {
          totalLyrics: result.data.count,
          dbPath: this.dbPath,
          ...result.data
        };
      } else {
        console.error('获取统计信息失败:', result.error);
        return null;
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return null;
    }
  }

  // 修复损坏的歌词数据
  async fixCorruptedLyrics() {
    if (!this.db) {
      await this.init();
    }

    try {
      const result = await window.electronAPI.fixCorruptedLyrics();
      
      if (result.success) {
        console.log('损坏歌词数据修复完成:', result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('修复损坏歌词数据失败:', error);
      throw error;
    }
  }
}

// 在浏览器环境中LyricsDB类会自动可用 