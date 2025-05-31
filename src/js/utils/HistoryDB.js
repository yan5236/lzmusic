// SQLite历史记录数据库管理类
class HistoryDB {
  constructor() {
    // 使用preload脚本暴露的electronAPI
    this.electronAPI = window.electronAPI;
    this.isInitialized = false;
  }

  // 初始化数据库
  async init() {
    if (this.isInitialized) return;

    try {
      if (!this.electronAPI || !this.electronAPI.historyDB) {
        throw new Error('无法访问Electron API，请检查preload脚本配置');
      }
      
      // 通过主进程初始化数据库
      const result = await this.electronAPI.historyDB.init();
      if (result.success) {
        this.isInitialized = true;
        console.log('历史记录数据库初始化成功');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('历史记录数据库初始化失败:', error);
      throw error;
    }
  }

  // 添加播放记录
  async add(video) {
    await this.ensureInitialized();
    
    try {
      const record = {
        bvid: video.bvid,
        title: video.title,
        author: video.author,
        cover: video.cover,
        duration: video.duration,
        cid: video.cid,
        play_time: Date.now()
      };

      const result = await this.electronAPI.historyDB.addRecord(record);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('添加播放记录失败:', error);
      throw error;
    }
  }

  // 获取所有历史记录
  async getAll(limit = 1000, offset = 0) {
    await this.ensureInitialized();
    
    try {
      const result = await this.electronAPI.historyDB.getAllRecords({ limit, offset });
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
  }

  // 按时间范围获取历史记录
  async getByTimeRange(timeRange, limit = 1000) {
    await this.ensureInitialized();
    
    try {
      const result = await this.electronAPI.historyDB.getRecordsByTimeRange(timeRange, limit);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('按时间获取历史记录失败:', error);
      return [];
    }
  }

  // 搜索历史记录
  async search(keyword, limit = 100) {
    await this.ensureInitialized();
    
    try {
      const result = await this.electronAPI.historyDB.searchRecords(keyword, limit);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('搜索历史记录失败:', error);
      return [];
    }
  }

  // 删除指定记录
  async remove(bvid) {
    await this.ensureInitialized();
    
    try {
      const result = await this.electronAPI.historyDB.removeRecord(bvid);
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('删除历史记录失败:', error);
      return false;
    }
  }

  // 清空所有历史记录
  async clear() {
    await this.ensureInitialized();
    
    try {
      const result = await this.electronAPI.historyDB.clearAllRecords();
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('清空历史记录失败:', error);
      return false;
    }
  }

  // 获取历史记录统计
  async getStats() {
    await this.ensureInitialized();
    
    try {
      const result = await this.electronAPI.historyDB.getStats();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取历史记录统计失败:', error);
      return { total: 0, today: 0, week: 0, month: 0 };
    }
  }

  // 确保数据库已初始化
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}

// 导出实例
window.HistoryDB = HistoryDB; 