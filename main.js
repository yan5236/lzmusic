const { app, BrowserWindow, shell, session, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

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
let lyricsDB = null;

// 歌词数据库管理
const LyricsDBManager = {
  // 初始化数据库
  init(dbPath) {
    return new Promise((resolve, reject) => {
      // 确保数据目录存在
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      lyricsDB = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('打开歌词数据库失败:', err);
          reject(err);
          return;
        }
        
        console.log('SQLite歌词数据库连接成功:', dbPath);
        
        // 创建歌词表
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS lyrics (
            id TEXT PRIMARY KEY,
            songKey TEXT NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            lyrics TEXT,
            translation TEXT,
            romaLyrics TEXT,
            platform TEXT DEFAULT 'manual',
            platformName TEXT DEFAULT '手动输入',
            quality INTEGER DEFAULT 0,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          )
        `;
        
        lyricsDB.run(createTableSQL, (err) => {
          if (err) {
            console.error('创建歌词表失败:', err);
            reject(err);
            return;
          }
          
          // 创建索引
          const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_songKey ON lyrics(songKey)',
            'CREATE INDEX IF NOT EXISTS idx_title ON lyrics(title)',
            'CREATE INDEX IF NOT EXISTS idx_artist ON lyrics(artist)',
            'CREATE INDEX IF NOT EXISTS idx_platform ON lyrics(platform)',
            'CREATE INDEX IF NOT EXISTS idx_createdAt ON lyrics(createdAt)'
          ];
          
          let indexCount = 0;
          indexes.forEach((indexSQL) => {
            lyricsDB.run(indexSQL, (err) => {
              if (err) {
                console.warn('创建索引失败:', err);
              }
              indexCount++;
              if (indexCount === indexes.length) {
                console.log('歌词数据库初始化完成');
                resolve();
              }
            });
          });
        });
      });
    });
  },

  // 保存歌词
  saveLyrics(lyricsData) {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const sql = `
        INSERT INTO lyrics (id, songKey, title, artist, lyrics, translation, romaLyrics, 
                           platform, platformName, quality, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        lyricsData.id,
        lyricsData.songKey,
        lyricsData.title,
        lyricsData.artist,
        lyricsData.lyrics,
        lyricsData.translation,
        lyricsData.romaLyrics,
        lyricsData.platform,
        lyricsData.platformName,
        lyricsData.quality,
        lyricsData.createdAt,
        lyricsData.updatedAt
      ];
      
      lyricsDB.run(sql, params, function(err) {
        if (err) {
          console.error('保存歌词失败:', err);
          reject(err);
          return;
        }
        
        console.log('歌词保存成功，ID:', lyricsData.id);
        resolve({ id: lyricsData.id, changes: this.changes });
      });
    });
  },

  // 获取歌词（返回最佳匹配）
  getLyrics(songKey) {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const sql = `
        SELECT * FROM lyrics 
        WHERE songKey = ? 
        ORDER BY quality DESC, createdAt DESC 
        LIMIT 1
      `;
      
      lyricsDB.get(sql, [songKey], (err, row) => {
        if (err) {
          console.error('查询歌词失败:', err);
          reject(err);
          return;
        }
        
        if (row) {
          console.log('找到歌词:', row.title, '-', row.artist);
        }
        resolve(row);
      });
    });
  },

  // 获取歌曲的所有歌词版本
  getAllLyricsVersions(songKey) {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const sql = `
        SELECT * FROM lyrics 
        WHERE songKey = ? 
        ORDER BY quality DESC, createdAt DESC
      `;
      
      lyricsDB.all(sql, [songKey], (err, rows) => {
        if (err) {
          console.error('查询歌词版本失败:', err);
          reject(err);
          return;
        }
        
        resolve(rows || []);
      });
    });
  },

  // 删除歌词
  deleteLyrics(lyricsId) {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const sql = 'DELETE FROM lyrics WHERE id = ?';
      
      lyricsDB.run(sql, [lyricsId], function(err) {
        if (err) {
          console.error('删除歌词失败:', err);
          reject(err);
          return;
        }
        
        console.log('歌词删除成功，ID:', lyricsId, '影响行数:', this.changes);
        resolve({ id: lyricsId, changes: this.changes });
      });
    });
  },

  // 更新歌词
  updateLyrics(lyricsId, updateData) {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      // 构建动态更新SQL
      const fields = Object.keys(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const sql = `UPDATE lyrics SET ${setClause} WHERE id = ?`;
      const params = [...Object.values(updateData), lyricsId];
      
      lyricsDB.run(sql, params, function(err) {
        if (err) {
          console.error('更新歌词失败:', err);
          reject(err);
          return;
        }
        
        if (this.changes === 0) {
          reject(new Error('歌词记录不存在'));
          return;
        }
        
        // 返回更新后的记录
        lyricsDB.get('SELECT * FROM lyrics WHERE id = ?', [lyricsId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('歌词更新成功，ID:', lyricsId);
          resolve(row);
        });
      });
    });
  },

  // 清空数据库
  clearDatabase() {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const sql = 'DELETE FROM lyrics';
      
      lyricsDB.run(sql, function(err) {
        if (err) {
          console.error('清空数据库失败:', err);
          reject(err);
          return;
        }
        
        console.log('歌词数据库已清空，删除行数:', this.changes);
        resolve({ changes: this.changes });
      });
    });
  },

  // 获取统计信息
  getStats() {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const sql = `
        SELECT 
          COUNT(*) as count,
          COUNT(DISTINCT songKey) as uniqueSongs,
          MIN(createdAt) as firstRecord,
          MAX(createdAt) as lastRecord
        FROM lyrics
      `;
      
      lyricsDB.get(sql, (err, row) => {
        if (err) {
          console.error('获取统计信息失败:', err);
          reject(err);
          return;
        }
        
        resolve(row);
      });
    });
  },

  // 搜索歌词
  searchLyrics(searchTerm) {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const sql = `
        SELECT * FROM lyrics 
        WHERE title LIKE ? OR artist LIKE ? OR lyrics LIKE ?
        ORDER BY quality DESC, createdAt DESC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      
      lyricsDB.all(sql, [searchPattern, searchPattern, searchPattern], (err, rows) => {
        if (err) {
          console.error('搜索歌词失败:', err);
          reject(err);
          return;
        }
        
        resolve(rows || []);
      });
    });
  },

  // 获取所有歌词
  getAllLyrics() {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const sql = `
        SELECT * FROM lyrics 
        ORDER BY createdAt DESC
      `;
      
      lyricsDB.all(sql, (err, rows) => {
        if (err) {
          console.error('获取所有歌词失败:', err);
          reject(err);
          return;
        }
        
        resolve(rows || []);
      });
    });
  },

  // 修复损坏的歌词数据
  fixCorruptedLyrics() {
    return new Promise((resolve, reject) => {
      if (!lyricsDB) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      // 查找包含 '[object Object]' 的记录
      const selectSql = "SELECT id, lyrics FROM lyrics WHERE lyrics LIKE '%[object Object]%'";
      
      lyricsDB.all(selectSql, (err, rows) => {
        if (err) {
          console.error('查找损坏数据失败:', err);
          reject(err);
          return;
        }
        
        if (rows.length === 0) {
          console.log('没有找到损坏的歌词数据');
          resolve({ fixed: 0 });
          return;
        }
        
        console.log(`找到${rows.length}条损坏的歌词数据，准备删除`);
        
        // 删除损坏的记录
        const deleteSql = "DELETE FROM lyrics WHERE lyrics LIKE '%[object Object]%'";
        
        lyricsDB.run(deleteSql, function(err) {
          if (err) {
            console.error('删除损坏数据失败:', err);
            reject(err);
            return;
          }
          
          console.log(`已删除${this.changes}条损坏的歌词记录`);
          resolve({ fixed: this.changes });
        });
      });
    });
  },
};

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

// 歌词数据库IPC处理器
// 初始化歌词数据库
ipcMain.handle('init-lyrics-db', async (event, dbPath) => {
  try {
    await LyricsDBManager.init(dbPath);
    return { success: true };
  } catch (error) {
    console.error('初始化歌词数据库失败:', error);
    return { success: false, error: error.message };
  }
});

// 保存歌词
ipcMain.handle('save-lyrics', async (event, lyricsData) => {
  try {
    const result = await LyricsDBManager.saveLyrics(lyricsData);
    return { success: true, data: result };
  } catch (error) {
    console.error('保存歌词失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取歌词
ipcMain.handle('get-lyrics', async (event, songKey) => {
  try {
    const result = await LyricsDBManager.getLyrics(songKey);
    return { success: true, data: result };
  } catch (error) {
    console.error('获取歌词失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取所有歌词版本
ipcMain.handle('get-all-lyrics-versions', async (event, songKey) => {
  try {
    const result = await LyricsDBManager.getAllLyricsVersions(songKey);
    return { success: true, data: result };
  } catch (error) {
    console.error('获取歌词版本失败:', error);
    return { success: false, error: error.message };
  }
});

// 删除歌词
ipcMain.handle('delete-lyrics', async (event, lyricsId) => {
  try {
    const result = await LyricsDBManager.deleteLyrics(lyricsId);
    return { success: true, data: result };
  } catch (error) {
    console.error('删除歌词失败:', error);
    return { success: false, error: error.message };
  }
});

// 更新歌词
ipcMain.handle('update-lyrics', async (event, lyricsId, updateData) => {
  try {
    const result = await LyricsDBManager.updateLyrics(lyricsId, updateData);
    return { success: true, data: result };
  } catch (error) {
    console.error('更新歌词失败:', error);
    return { success: false, error: error.message };
  }
});

// 清空歌词数据库
ipcMain.handle('clear-lyrics-db', async (event) => {
  try {
    const result = await LyricsDBManager.clearDatabase();
    return { success: true, data: result };
  } catch (error) {
    console.error('清空歌词数据库失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取歌词数据库统计信息
ipcMain.handle('get-lyrics-stats', async (event) => {
  try {
    const result = await LyricsDBManager.getStats();
    return { success: true, data: result };
  } catch (error) {
    console.error('获取歌词统计信息失败:', error);
    return { success: false, error: error.message };
  }
});

// 设置歌词（兼容新API）
ipcMain.handle('set-lyrics', async (event, songKey, lyrics) => {
  try {
    const lyricsData = {
      id: `${songKey}_${Date.now()}`,
      songKey: songKey,
      title: '', // 可以从songKey解析出来
      artist: '',
      lyrics: lyrics,
      translation: null,
      romaLyrics: null,
      platform: 'manual',
      platformName: '手动输入',
      quality: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const result = await LyricsDBManager.saveLyrics(lyricsData);
    return { success: true, data: result };
  } catch (error) {
    console.error('设置歌词失败:', error);
    return { success: false, error: error.message };
  }
});

// 搜索歌词
ipcMain.handle('search-lyrics', async (event, searchTerm) => {
  try {
    const result = await LyricsDBManager.searchLyrics(searchTerm);
    return { success: true, data: result };
  } catch (error) {
    console.error('搜索歌词失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取所有歌词
ipcMain.handle('get-all-lyrics', async (event) => {
  try {
    const result = await LyricsDBManager.getAllLyrics();
    return { success: true, data: result };
  } catch (error) {
    console.error('获取所有歌词失败:', error);
    return { success: false, error: error.message };
  }
});

// 清空所有歌词
ipcMain.handle('clear-all-lyrics', async (event) => {
  try {
    const result = await LyricsDBManager.clearDatabase();
    return { success: true, data: result };
  } catch (error) {
    console.error('清空所有歌词失败:', error);
    return { success: false, error: error.message };
  }
});

// 路径拼接API
ipcMain.handle('path-join', async (event, paths) => {
  try {
    const result = path.join(...paths);
    return result;
  } catch (error) {
    console.error('路径拼接失败:', error);
    return null;
  }
});

// 网易云API IPC处理器
ipcMain.handle('netease-api', async (event, method, params = {}) => {
  try {
    const result = await NeteaseAPIModule.callApi(method, params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 修复损坏的歌词数据
ipcMain.handle('fix-corrupted-lyrics', async (event) => {
  try {
    const result = await LyricsDBManager.fixCorruptedLyrics();
    return { success: true, data: result };
  } catch (error) {
    console.error('修复损坏歌词数据失败:', error);
    return { success: false, error: error.message };
  }
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