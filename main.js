const { app, BrowserWindow, shell, session, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

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
let neteaseAPIProcess = null;

// 网易云API服务器管理
const NeteaseAPIManager = {
  port: 3000,
  isRunning: false,
  
  async start() {
    if (this.isRunning) {
      return { success: true, message: 'API服务器已在运行' };
    }
    
    try {
      // 检查端口是否被占用
      const isPortInUse = await this.checkPort();
      if (isPortInUse) {
        this.isRunning = true;
        return { success: true, message: 'API服务器已在运行' };
      }
      
      console.log('开始启动网易云音乐API服务器...');
      
      // 启动npx NeteaseCloudMusicApi
      const command = 'npx';
      const args = ['NeteaseCloudMusicApi@latest'];
      
      // 设置环境变量
      const env = { 
        ...process.env, 
        PORT: this.port.toString(),
        FORCE_COLOR: 'true'
      };
      
      neteaseAPIProcess = spawn(command, args, {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        windowsHide: true
      });
      
      console.log(`正在启动网易云API服务器，PID: ${neteaseAPIProcess.pid}`);
      
      let serverStarted = false;
      
      neteaseAPIProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[NeteaseAPI] ${output}`);
        
        // 检查服务器是否启动成功的多种标识
        if (output.includes('server running') || 
            output.includes('listening') || 
            output.includes(`${this.port}`) ||
            output.includes('Server running') ||
            output.includes('服务器启动') ||
            output.includes('启动成功') ||
            output.includes('listening on')) {
          serverStarted = true;
          this.isRunning = true;
          console.log('网易云API服务器启动成功');
        }
      });
      
      neteaseAPIProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.warn(`[NeteaseAPI Error] ${error}`);
        
        // 即使有错误输出，也可能是正常的警告
        if (error.includes('server running') || 
            error.includes('listening') ||
            error.includes(`${this.port}`) ||
            error.includes('Server running') ||
            error.includes('服务器启动') ||
            error.includes('启动成功') ||
            error.includes('listening on')) {
          serverStarted = true;
          this.isRunning = true;
        }
      });
      
      neteaseAPIProcess.on('close', (code) => {
        console.log(`网易云API进程退出，代码: ${code}`);
        this.isRunning = false;
        neteaseAPIProcess = null;
      });
      
      neteaseAPIProcess.on('error', (error) => {
        console.error('启动网易云API服务器失败:', error);
        this.isRunning = false;
        neteaseAPIProcess = null;
      });
      
      // 等待服务器启动，最多等待10秒
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (serverStarted || await this.checkPort()) {
          this.isRunning = true;
          console.log('网易云API服务器启动验证成功');
          return { success: true, message: '网易云API服务器启动成功' };
        }
      }
      
      // 如果10秒后还没启动成功
      console.warn('网易云API服务器启动超时');
      return { success: false, message: '网易云API服务器启动超时，请手动运行: npx NeteaseCloudMusicApi@latest' };
      
    } catch (error) {
      console.error('启动网易云API服务器时出错:', error);
      return { success: false, message: `启动失败: ${error.message}` };
    }
  },
  
  async checkPort() {
    return new Promise((resolve) => {
      // 尝试访问API根路径
      const req = http.get(`http://localhost:${this.port}/`, (res) => {
        console.log(`端口检查响应状态: ${res.statusCode}`);
        resolve(res.statusCode === 200);
      });
      
      req.on('error', (error) => {
        console.log(`端口检查失败: ${error.message}`);
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        console.log('端口检查超时');
        req.abort();
        resolve(false);
      });
    });
  },
  
  stop() {
    if (neteaseAPIProcess) {
      neteaseAPIProcess.kill();
      neteaseAPIProcess = null;
    }
    this.isRunning = false;
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
    
    // 应用启动后自动启动网易云音乐API服务器
    console.log('正在自动启动网易云音乐API服务器...');
    NeteaseAPIManager.start().then(result => {
      if (result.success) {
        console.log('网易云音乐API服务器自动启动成功:', result.message);
      } else {
        console.warn('网易云音乐API服务器自动启动失败:', result.message);
        console.log('您可以手动运行: npx NeteaseCloudMusicApi@latest');
      }
    }).catch(error => {
      console.error('启动网易云音乐API服务器时出错:', error);
    });
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
ipcMain.handle('start-netease-api', async () => {
  return await NeteaseAPIManager.start();
});

ipcMain.handle('check-netease-api', async () => {
  const isRunning = await NeteaseAPIManager.checkPort();
  return { isRunning };
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
  // 清理网易云API进程
  NeteaseAPIManager.stop();
  
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