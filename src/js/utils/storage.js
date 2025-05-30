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