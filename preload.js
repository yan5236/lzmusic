const { contextBridge, ipcRenderer } = require('electron');

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 启动网易云API服务器
  startNeteaseAPI: () => ipcRenderer.invoke('start-netease-api'),
  
  // 检查网易云API服务器状态
  checkNeteaseAPI: () => ipcRenderer.invoke('check-netease-api')
}); 