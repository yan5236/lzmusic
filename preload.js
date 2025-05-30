const { contextBridge, ipcRenderer } = require('electron');

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 调用网易云API模块
  callNeteaseApi: (method, params) => ipcRenderer.invoke('call-netease-api', method, params)
}); 