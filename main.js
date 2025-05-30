const { app, BrowserWindow, shell, session, ipcMain } = require('electron');
const path = require('path');

// 设置控制台输出编码为UTF-8，解决中文乱码
if (process.platform === 'win32') {
  // 设置环境变量
  process.env.PYTHONIOENCODING = 'utf-8';
  process.env.LANG = 'zh_CN.UTF-8';
  
  // 设置Node.js的默认编码
  if (process.stdout && process.stdout.setDefaultEncoding) {
    process.stdout.setDefaultEncoding('utf8');
  }
  if (process.stderr && process.stderr.setDefaultEncoding) {
    process.stderr.setDefaultEncoding('utf8');
  }
  
  // 尝试设置控制台代码页
  const { exec } = require('child_process');
  exec('chcp 65001', { encoding: 'utf8' }, (error) => {
    if (error) {
      console.warn('无法设置控制台代码页到UTF-8');
    }
  });
}

let mainWindow;

// 网易云API模块管理
const NeteaseAPIModule = {
  // 调用网易云API模块
  async callApi(method, params = {}) {
    try {
      // 动态导入网易云API模块
      const neteaseApi = require('NeteaseCloudMusicApi');
      
      if (!neteaseApi[method]) {
        throw new Error(`API方法 ${method} 不存在`);
      }
      
      console.log(`调用网易云API: ${method}`, params);
      const result = await neteaseApi[method](params);
      console.log(`API调用结果: ${method}`, { status: result.status, hasBody: !!result.body });
      
      return result;
    } catch (error) {
      console.error(`调用网易云API失败 (${method}):`, error);
      throw error;
    }
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  // 设置请求头拦截器解决防盗链问题
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.includes('bilivideo.com') || details.url.includes('bilibili.com')) {
      details.requestHeaders['Referer'] = 'https://www.bilibili.com/';
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      // 添加buvid3 cookie以避免412错误
      if (!details.requestHeaders['Cookie']) {
        details.requestHeaders['Cookie'] = '';
      }
      // 生成简单的buvid3值
      const buvid3 = generateBuvid3();
      details.requestHeaders['Cookie'] += `; buvid3=${buvid3}`;
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('LZ Music 应用已启动');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 开发环境下打开调试工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// IPC事件处理
ipcMain.handle('call-netease-api', async (event, method, params) => {
  return await NeteaseAPIModule.callApi(method, params);
});

// 生成buvid3值的简单函数
function generateBuvid3() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += Date.now().toString(36).slice(-8) + 'infoc';
  return result;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 处理外部链接
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, url) => {
    navigationEvent.preventDefault();
    shell.openExternal(url);
  });
});

// 处理证书错误
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // 开发环境忽略证书错误
  event.preventDefault();
  callback(true);
}); 