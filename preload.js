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
  
  // 修复损坏的歌词数据
  fixCorruptedLyrics: () => ipcRenderer.invoke('fix-corrupted-lyrics'),
  
  // 文件系统操作API
  path: {
    join: (...paths) => ipcRenderer.invoke('path-join', paths)
  }
}); 