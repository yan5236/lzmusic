import { app, BrowserWindow, session, protocol, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { Readable } from 'stream';
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
const isMac = process.platform === 'darwin';
let mainWindow: BrowserWindow | null = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'localmusic',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
      allowServiceWorkers: true,
    }
  }
]);

app.on('ready', () => {
  // 注册 localmusic:// 自定义协议（用于加载本地音频文件，支持 Range 请求）
  // 使用 protocol.handle + Response(web 流) 以保持浏览器端的安全校验通过
  protocol.handle('localmusic', async (request) => {
    try {
      // 提取并解码文件路径
      // URL 格式: localmusic://localhost/E%3A%2Fmusic%2Fsong.mp3
      // 需要去掉 localmusic://localhost/ 前缀，然后解码
      const url = new URL(request.url);
      let filePath = decodeURIComponent(url.pathname);

      // 移除开头的斜杠（Windows 路径不需要）
      // /E:/music/song.mp3 -> E:/music/song.mp3
      if (filePath.startsWith('/') && /^\/[A-Za-z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }

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

        // 校验 Range 范围是否合法
        if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
          console.error('[localmusic protocol] 非法的 Range 请求:', rangeHeader);
          return new Response('Requested Range Not Satisfiable', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`,
            },
          });
        }

        const chunkSize = end - start + 1;
        console.log(`[localmusic protocol] Range 请求: ${start}-${end}/${fileSize}`);

        const nodeStream = fs.createReadStream(filePath, { start, end, highWaterMark: 256 * 1024 });
        nodeStream.on('error', (streamErr) => {
          console.error('[localmusic protocol] 读取流错误:', streamErr);
        });

        // 将 Node stream 转为 Web ReadableStream
        const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': chunkSize.toString(),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
          },
        });
      } else {
        // 无 Range 请求，流式返回完整文件（通常浏览器随后会发 Range）
        console.log(`[localmusic protocol] 完整文件请求: ${fileSize} bytes`);

        const nodeStream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });
        nodeStream.on('error', (streamErr) => {
          console.error('[localmusic protocol] 读取流错误:', streamErr);
        });

        const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': fileSize.toString(),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
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

  ipcMain.handle('window-control', (event, action: 'minimize' | 'toggle-maximize' | 'close' | 'get-state') => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;

    if (!targetWindow) {
      return { success: false, isMaximized: false };
    }

    switch (action) {
      case 'minimize':
        targetWindow.minimize();
        break;
      case 'toggle-maximize':
        if (targetWindow.isMaximized()) {
          targetWindow.unmaximize();
        } else {
          targetWindow.maximize();
        }
        break;
      case 'close':
        targetWindow.close();
        break;
      case 'get-state':
      default:
        break;
    }

    return { success: true, isMaximized: targetWindow.isMaximized() };
  });

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    title: 'LZMusic',
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#0f172a',
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    autoHideMenuBar: true,
    icon: path.join(app.getAppPath(), 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // preload 需要禁用 sandbox
      preload: path.join(__dirname, '..', 'preload.js'),
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // 可选：让窗口获得焦点
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });


  if (isDev()) {
    mainWindow.loadURL('http://localhost:5238');
    // 自动在开发环境打开调试工具，便于排查问题
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
  }
});

// 应用退出时关闭数据库连接
app.on('before-quit', () => {
  lyricsDatabase.close();
  appDatabase.close();
});
