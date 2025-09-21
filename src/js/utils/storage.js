// 本地存储工具类
class Storage {
  constructor() {
    this.prefix = 'lzmusic_';
  }

  // 设置数据
  set(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.prefix + key, serializedValue);
      return true;
    } catch (error) {
      console.error('保存数据失败:', error);
      return false;
    }
  }

  // 获取数据
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error('读取数据失败:', error);
      return defaultValue;
    }
  }

  // 删除数据
  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('删除数据失败:', error);
      return false;
    }
  }

  // 清空所有数据
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }

  // 检查是否存在
  has(key) {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  // 获取所有键
  keys() {
    const keys = Object.keys(localStorage);
    return keys.filter(key => key.startsWith(this.prefix))
              .map(key => key.substring(this.prefix.length));
  }
}

// 播放历史管理
class PlayHistory {
  constructor() {
    this.storage = new Storage();
    this.maxHistory = 100; // 最大历史记录数
  }

  // 添加播放记录
  add(video) {
    const history = this.getAll();
    
    // 移除已存在的记录
    const existingIndex = history.findIndex(item => item.bvid === video.bvid);
    if (existingIndex > -1) {
      history.splice(existingIndex, 1);
    }

    // 添加到开头
    history.unshift({
      ...video,
      playTime: Date.now()
    });

    // 限制历史记录数量
    if (history.length > this.maxHistory) {
      history.splice(this.maxHistory);
    }

    return this.storage.set('playHistory', history);
  }

  // 获取所有历史记录
  getAll() {
    return this.storage.get('playHistory', []);
  }

  // 清空历史记录
  clear() {
    return this.storage.remove('playHistory');
  }

  // 删除指定记录
  remove(bvid) {
    const history = this.getAll();
    const filteredHistory = history.filter(item => item.bvid !== bvid);
    return this.storage.set('playHistory', filteredHistory);
  }
}

// 播放列表管理
class PlaylistManager {
  constructor() {
    this.storage = new Storage();
  }

  // 创建播放列表
  create(name, songs = []) {
    const playlists = this.getAll();
    const playlist = {
      id: Date.now().toString(),
      name,
      songs,
      createTime: Date.now(),
      updateTime: Date.now()
    };

    playlists.push(playlist);
    this.storage.set('playlists', playlists);
    return playlist;
  }

  // 获取所有播放列表
  getAll() {
    return this.storage.get('playlists', []);
  }

  // 获取指定播放列表
  get(id) {
    const playlists = this.getAll();
    return playlists.find(playlist => playlist.id === id);
  }

  // 更新播放列表
  update(id, updates) {
    const playlists = this.getAll();
    const index = playlists.findIndex(playlist => playlist.id === id);
    
    if (index > -1) {
      playlists[index] = {
        ...playlists[index],
        ...updates,
        updateTime: Date.now()
      };
      this.storage.set('playlists', playlists);
      return playlists[index];
    }
    return null;
  }

  // 删除播放列表
  delete(id) {
    const playlists = this.getAll();
    const filteredPlaylists = playlists.filter(playlist => playlist.id !== id);
    return this.storage.set('playlists', filteredPlaylists);
  }

  // 添加歌曲到播放列表
  addSong(id, song) {
    const playlist = this.get(id);
    if (playlist) {
      // 检查是否已存在
      const exists = playlist.songs.some(s => s.bvid === song.bvid);
      if (!exists) {
        playlist.songs.push(song);
        return this.update(id, { songs: playlist.songs });
      }
    }
    return playlist;
  }

  // 从播放列表移除歌曲
  removeSong(id, bvid) {
    const playlist = this.get(id);
    if (playlist) {
      playlist.songs = playlist.songs.filter(song => song.bvid !== bvid);
      return this.update(id, { songs: playlist.songs });
    }
    return playlist;
  }

  // 导出歌单
  exportPlaylist(playlistId = null) {
    try {
      let exportData;

      if (playlistId === null || playlistId === 'all') {
        // 导出所有歌单
        const allPlaylists = this.getAll();
        exportData = {
          type: 'playlists',
          exportTime: Date.now(),
          count: allPlaylists.length,
          playlists: allPlaylists.map(playlist => ({
            name: playlist.name,
            createTime: playlist.createTime,
            updateTime: playlist.updateTime,
            songs: playlist.songs.map(song => ({
              title: song.title,
              author: song.author,
              bvid: song.bvid,
              duration: song.duration,
              cover: song.cover,
              cid: song.cid,
              pages: song.pages,
              play: song.play
            }))
          }))
        };
      } else {
        // 导出单个歌单
        const playlist = this.get(playlistId);
        if (!playlist) {
          throw new Error('歌单不存在');
        }

        exportData = {
          type: 'playlist',
          exportTime: Date.now(),
          count: 1,
          playlist: {
            name: playlist.name,
            createTime: playlist.createTime,
            updateTime: playlist.updateTime,
            songs: playlist.songs.map(song => ({
              title: song.title,
              author: song.author,
              bvid: song.bvid,
              duration: song.duration,
              cover: song.cover,
              cid: song.cid,
              pages: song.pages,
              play: song.play
            }))
          }
        };
      }

      return exportData;
    } catch (error) {
      console.error('导出歌单失败:', error);
      return null;
    }
  }

  // 导入歌单
  importPlaylist(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        messages: []
      };

      // 验证数据格式
      if (!data.type || (data.type !== 'playlist' && data.type !== 'playlists')) {
        throw new Error('不是有效的歌单导出文件');
      }

      const playlistsToImport = data.type === 'playlist' ? [data.playlist] : data.playlists;

      if (!Array.isArray(playlistsToImport)) {
        throw new Error('歌单数据格式错误');
      }

      // 导入每个歌单
      playlistsToImport.forEach(playlistData => {
        try {
          if (!playlistData.name || !Array.isArray(playlistData.songs)) {
            results.failed++;
            results.messages.push(`歌单 "${playlistData.name || '未知'}" 数据格式错误`);
            return;
          }

          // 检查歌单名称冲突
          const existingPlaylists = this.getAll();
          let finalName = playlistData.name;
          let nameCounter = 1;

          while (existingPlaylists.some(p => p.name === finalName)) {
            finalName = `${playlistData.name} (${nameCounter})`;
            nameCounter++;
          }

          // 验证歌曲数据
          const validSongs = playlistData.songs.filter(song => {
            return song.title && song.author && song.bvid;
          });

          if (validSongs.length === 0) {
            results.skipped++;
            results.messages.push(`歌单 "${playlistData.name}" 没有有效的歌曲，已跳过`);
            return;
          }

          // 创建新歌单
          const newPlaylist = this.create(finalName, validSongs);

          if (newPlaylist) {
            results.success++;
            if (finalName !== playlistData.name) {
              results.messages.push(`歌单 "${playlistData.name}" 已导入为 "${finalName}" (重名自动重命名)`);
            } else {
              results.messages.push(`歌单 "${finalName}" 导入成功，包含 ${validSongs.length} 首歌曲`);
            }
          } else {
            results.failed++;
            results.messages.push(`歌单 "${playlistData.name}" 导入失败`);
          }

        } catch (error) {
          results.failed++;
          results.messages.push(`歌单 "${playlistData.name || '未知'}" 导入失败: ${error.message}`);
        }
      });

      return results;
    } catch (error) {
      console.error('导入歌单失败:', error);
      return {
        success: 0,
        failed: 1,
        skipped: 0,
        messages: [`导入失败: ${error.message}`]
      };
    }
  }
}

// 用户设置管理
class Settings {
  constructor() {
    this.storage = new Storage();
    this.defaults = {
      volume: 100,
      autoPlay: true,
      playMode: 'sequence', // sequence, random, repeat
      quality: 'medium', // high, medium, low
      theme: 'light',
      sidebarCollapsed: false,
      // 关闭行为设置
      closeAction: 'ask', // 'ask': 询问, 'close': 直接关闭, 'minimize': 最小化到托盘
      dontAskAgain: false, // 不再询问
      // 网易云API设置
      neteaseApi: {
        enabled: true,        // 是否启用网易云API
        autoStart: true,      // 是否自动启动
        port: 3000,          // API端口
        host: 'localhost'    // API主机地址
      }
    };
  }

  // 获取设置
  get(key, defaultValue = null) {
    const settings = this.storage.get('settings', {});
    if (key) {
      return settings[key] !== undefined ? settings[key] : 
             (this.defaults[key] !== undefined ? this.defaults[key] : defaultValue);
    }
    return { ...this.defaults, ...settings };
  }

  // 设置
  set(key, value) {
    const settings = this.get();
    settings[key] = value;
    return this.storage.set('settings', settings);
  }

  // 批量设置
  setMultiple(updates) {
    const settings = this.get();
    Object.assign(settings, updates);
    return this.storage.set('settings', settings);
  }

  // 重置设置
  reset() {
    return this.storage.set('settings', { ...this.defaults });
  }
}

// 导出类
window.Storage = Storage;
window.PlayHistory = PlayHistory;
window.PlaylistManager = PlaylistManager;
window.Settings = Settings; 