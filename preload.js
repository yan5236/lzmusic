const { contextBridge, ipcRenderer } = require('electron');

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 网易云音乐API
  callNeteaseApi: (method, params) => ipcRenderer.invoke('netease-api', method, params),
  
  // 歌词数据库API
  lyricsDB: {
    init: (dbPath) => ipcRenderer.invoke('init-lyrics-db', dbPath),
    saveLyrics: (lyricsData) => ipcRenderer.invoke('save-lyrics', lyricsData),
    setLyrics: (songKey, lyrics) => ipcRenderer.invoke('set-lyrics', songKey, lyrics),
    getLyrics: (songKey) => ipcRenderer.invoke('get-lyrics', songKey),
    getAllLyricsVersions: (songKey) => ipcRenderer.invoke('get-all-lyrics-versions', songKey),
    deleteLyrics: (lyricsId) => ipcRenderer.invoke('delete-lyrics', lyricsId),
    updateLyrics: (lyricsId, updateData) => ipcRenderer.invoke('update-lyrics', lyricsId, updateData),
    searchLyrics: (searchTerm) => ipcRenderer.invoke('search-lyrics', searchTerm),
    getAllLyrics: () => ipcRenderer.invoke('get-all-lyrics'),
    clearDatabase: () => ipcRenderer.invoke('clear-lyrics-db'),
    clearAllLyrics: () => ipcRenderer.invoke('clear-all-lyrics'),
    getStats: () => ipcRenderer.invoke('get-lyrics-stats')
  },
  
  // 历史记录数据库API
  historyDB: {
    init: () => ipcRenderer.invoke('init-history-db'),
    addRecord: (record) => ipcRenderer.invoke('add-history-record', record),
    getAllRecords: (options) => ipcRenderer.invoke('get-all-history', options),
    getRecordsByTimeRange: (timeRange, limit) => ipcRenderer.invoke('get-history-by-time', { timeRange, limit }),
    searchRecords: (keyword, limit) => ipcRenderer.invoke('search-history', { keyword, limit }),
    removeRecord: (bvid) => ipcRenderer.invoke('remove-history-record', bvid),
    clearAllRecords: () => ipcRenderer.invoke('clear-all-history'),
    getStats: () => ipcRenderer.invoke('get-history-stats')
  },
  
  // 修复损坏的歌词数据
  fixCorruptedLyrics: () => ipcRenderer.invoke('fix-corrupted-lyrics'),
  
  // 窗口控制API
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    forceClose: () => ipcRenderer.invoke('window-force-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    minimizeToTray: () => ipcRenderer.invoke('window-minimize-to-tray'),
    updateTrayMenu: (playerState) => ipcRenderer.invoke('update-tray-menu', playerState)
  },
  
  // 文件系统操作API
  path: {
    join: (...paths) => ipcRenderer.invoke('path-join', paths)
  },
  
  // 托盘事件监听
  onTrayTogglePlay: (callback) => ipcRenderer.on('tray-toggle-play', callback),
  onTrayPlayPrevious: (callback) => ipcRenderer.on('tray-play-previous', callback),
  onTrayPlayNext: (callback) => ipcRenderer.on('tray-play-next', callback),
  
  removeTrayListeners: () => {
    ipcRenderer.removeAllListeners('tray-toggle-play');
    ipcRenderer.removeAllListeners('tray-play-previous');
    ipcRenderer.removeAllListeners('tray-play-next');
  }
}); 