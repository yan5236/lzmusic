import { protocol } from 'electron';
import path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';

// 注册 localmusic:// 自定义协议 schema
export function registerLocalmusicScheme() {
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
}

// 绑定 localmusic:// 处理逻辑（支持 Range）
export function registerLocalMusicProtocolHandler() {
  protocol.handle('localmusic', async (request) => {
    try {
      const url = new URL(request.url);
      let filePath = decodeURIComponent(url.pathname);

      // /E:/music/song.mp3 -> E:/music/song.mp3
      if (filePath.startsWith('/') && /^\/[A-Za-z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }

      console.log('[localmusic protocol] 请求 URL:', request.url);
      console.log('[localmusic protocol] 解码后路径:', filePath);

      filePath = path.normalize(filePath);

      if (!fs.existsSync(filePath)) {
        console.error('[localmusic protocol] 文件不存在:', filePath);
        return new Response('File not found', { status: 404 });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
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
      const rangeHeader = request.headers.get('range');

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

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
      }

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
    } catch (error) {
      console.error('[localmusic protocol] 错误:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });
}
