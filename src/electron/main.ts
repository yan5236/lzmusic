import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { isDev } from './util.js';
import { registerBilibiliHandlers } from './api/bilibiliHandler.js';

// 在 ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.on('ready', () => {
  // 注册 Bilibili API IPC 处理器
  registerBilibiliHandlers();

  // 配置 B站图片和音频流请求的 Referer 头,解决防盗链问题
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // 处理 B站图片和音频流的请求头
    if (details.url.includes('hdslb.com') || details.url.includes('bilivideo.com')) {
      details.requestHeaders['Referer'] = 'https://www.bilibili.com/';
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  // 配置内容安全策略（CSP）- 允许加载Bilibili音频和图片
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev()
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data:; img-src 'self' data: https: http:; media-src 'self' https://*.bilivideo.com https://*.hdslb.com data: blob:;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https://*.bilivideo.com https://*.hdslb.com data: blob:;"
        ]
      }
    });
  });

  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // preload 需要禁用 sandbox
      preload: path.join(__dirname, '..', 'preload.js'),
    }
  });

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5238');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
  }
});