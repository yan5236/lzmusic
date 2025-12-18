import { session } from 'electron';

export function configureSessionSecurity(isDev: boolean) {
  // 配置 B站图片和音频流请求的 Referer 头,解决防盗链问题
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
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
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data:; img-src 'self' data: https: http: localmusic: file:; media-src 'self' https://*.bilivideo.com https://*.hdslb.com https://*.biliimg.com data: blob: localmusic: file:;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: localmusic: file:; media-src 'self' https://*.bilivideo.com https://*.hdslb.com https://*.biliimg.com data: blob: localmusic: file:;"
        ]
      }
    });
  });
}
