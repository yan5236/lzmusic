import { app, BrowserWindow, session, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { isDev } from './util.js';
import { registerBilibiliHandlers } from './api/bilibiliHandler.js';
import { registerNeteaseHandlers } from './api/neteaseHandler.js';
import { lyricsDatabase } from './database/lyricsDatabase.js';
import { registerLyricsDbHandlers } from './api/lyricsDbHandler.js';
import { appDatabase } from './database/appDatabase.js';
import { registerAppDbHandlers } from './api/appDbHandler.js';
import { registerPlaylistHandlers } from './api/playlistHandler.js';
import { registerLocalMusicHandlers } from './api/localMusicHandler.js';

// 在 ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.on('ready', () => {
  // 注册 localmusic:// 自定义协议（用于加载本地音频文件，支持 Range 请求）
  // 使用 Buffer 读取文件，避免流超时问题
  protocol.handle('localmusic', async (request) => {
    try {
      // 提取并解码文件路径
      const url = request.url.replace('localmusic://', '');
      let filePath = decodeURIComponent(url);

      console.log('[localmusic protocol] 请求 URL:', request.url);
      console.log('[localmusic protocol] 解码后路径:', filePath);

      // 规范化路径
      filePath = path.normalize(filePath);

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.error('[localmusic protocol] 文件不存在:', filePath);
        return new Response('File not found', { status: 404 });
      }

      // 获取文件信息
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      // 根据文件扩展名确定 MIME 类型
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      // 解析 Range 请求头
      const rangeHeader = request.headers.get('range');

      if (rangeHeader) {
        // 处理 Range 请求 (例如: "bytes=0-1023")
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        console.log(`[localmusic protocol] Range 请求: ${start}-${end}/${fileSize}`);

        // 读取指定范围的文件数据到 Buffer
        const buffer = Buffer.alloc(chunkSize);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, chunkSize, start);
        fs.closeSync(fd);

        // 返回 206 Partial Content 响应
        return new Response(buffer, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': chunkSize.toString(),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
          },
        });
      } else {
        // 无 Range 请求，返回完整文件
        // 对于音频文件，通常会先请求完整文件元数据，然后再用 Range 请求分块加载
        console.log(`[localmusic protocol] 完整文件请求: ${fileSize} bytes`);

        // 读取完整文件到 Buffer
        const buffer = fs.readFileSync(filePath);

        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': fileSize.toString(),
            'Accept-Ranges': 'bytes',
          },
        });
      }
    } catch (error) {
      console.error('[localmusic protocol] 错误:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  // 初始化歌词数据库
  lyricsDatabase.initialize();

  // 初始化应用数据库
  appDatabase.initialize();

  // 注册 Bilibili API IPC 处理器
  registerBilibiliHandlers();

  // 注册网易云音乐 API IPC 处理器
  registerNeteaseHandlers();

  // 注册歌词数据库 IPC 处理器
  registerLyricsDbHandlers();

  // 注册应用数据库 IPC 处理器
  registerAppDbHandlers();

  // 注册歌单 IPC 处理器
  registerPlaylistHandlers();

  // 注册本地音乐 IPC 处理器
  registerLocalMusicHandlers();

  // 配置 B站图片和音频流请求的 Referer 头,解决防盗链问题
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // 处理 B站图片和音频流的请求头（包括 biliimg.com 域名）
    if (
      details.url.includes('hdslb.com') ||
      details.url.includes('bilivideo.com') ||
      details.url.includes('biliimg.com')
    ) {
      details.requestHeaders['Referer'] = 'https://www.bilibili.com/';
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  // 配置内容安全策略（CSP）- 允许加载Bilibili音频和图片以及本地音频文件
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev()
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data:; img-src 'self' data: https: http: localmusic: file:; media-src 'self' https://*.bilivideo.com https://*.hdslb.com https://*.biliimg.com data: blob: localmusic: file:;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: localmusic: file:; media-src 'self' https://*.bilivideo.com https://*.hdslb.com https://*.biliimg.com data: blob: localmusic: file:;"
        ]
      }
    });
  });

  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: path.join(app.getAppPath(), 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // preload 需要禁用 sandbox
      preload: path.join(__dirname, '..', 'preload.js'),
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 可选：让窗口获得焦点
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });


  if (isDev()) {
    mainWindow.loadURL('http://localhost:5238');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
  }
});

// 应用退出时关闭数据库连接
app.on('before-quit', () => {
  lyricsDatabase.close();
  appDatabase.close();
});