// 网易云音乐API模块
class NeteaseAPI {
  constructor() {
    this.baseUrl = 'http://localhost:3000'; // 默认本地服务器地址
    this.isServerRunning = false;
    this.startupAttempted = false;
    this.checkServerStatus();
  }

  // 检查API服务器状态
  async checkServerStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      this.isServerRunning = response.ok;
      return this.isServerRunning;
    } catch (error) {
      this.isServerRunning = false;
      return false;
    }
  }

  // 启动本地API服务器
  async startLocalServer() {
    try {
      if (this.startupAttempted) {
        console.log('API服务器启动已尝试过，跳过重复启动');
        return false;
      }
      
      this.startupAttempted = true;
      console.log('正在尝试启动网易云音乐API服务器...');
      
      // 如果是Electron环境，通过主进程启动服务器
      if (window.electronAPI && window.electronAPI.startNeteaseAPI) {
        const result = await window.electronAPI.startNeteaseAPI();
        console.log('API服务器启动结果:', result);
        
        if (result.success) {
          this.isServerRunning = true;
          console.log('网易云音乐API服务器启动成功');
          return true;
        } else {
          console.error('启动API服务器失败:', result.message);
          throw new Error(result.message);
        }
      }
      
      // 如果没有Electron API，提示用户手动启动
      console.warn('需要手动启动网易云API服务器: npx NeteaseCloudMusicApi@latest');
      throw new Error('无法自动启动API服务器，请手动启动');
    } catch (error) {
      console.error('启动API服务器失败:', error);
      throw error;
    }
  }

  // 搜索歌曲
  async searchSongs(keyword, limit = 20) {
    try {
      // 首先检查服务器状态
      if (!this.isServerRunning) {
        console.log('检查服务器状态...');
        const isRunning = await this.checkServerStatus();
        
        if (!isRunning) {
          console.log('服务器未运行，尝试启动...');
          await this.startLocalServer();
          
          // 启动后再次检查
          await new Promise(resolve => setTimeout(resolve, 2000));
          const finalCheck = await this.checkServerStatus();
          
          if (!finalCheck) {
            throw new Error('网易云音乐API服务器启动失败，请手动运行: npx NeteaseCloudMusicApi@latest');
          }
        }
      }

      console.log(`开始搜索歌曲: ${keyword}`);
      const response = await fetch(`${this.baseUrl}/search?keywords=${encodeURIComponent(keyword)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`搜索请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('搜索响应:', data);
      
      if (data.code === 200 && data.result && data.result.songs) {
        const songs = data.result.songs.map(song => ({
          id: song.id,
          name: song.name,
          artist: song.artists ? song.artists.map(a => a.name).join('/') : '未知艺术家',
          album: song.album ? song.album.name : '未知专辑',
          duration: song.duration || 0
        }));
        
        console.log(`搜索成功，找到 ${songs.length} 首歌曲`);
        return songs;
      }
      
      console.warn('搜索结果格式异常:', data);
      return [];
    } catch (error) {
      console.error('搜索歌曲失败:', error);
      throw error; // 抛出错误而不是返回空数组
    }
  }

  // 获取歌词
  async getLyrics(songId) {
    try {
      if (!this.isServerRunning) {
        await this.checkServerStatus();
        if (!this.isServerRunning) {
          throw new Error('API服务器未运行');
        }
      }

      const response = await fetch(`${this.baseUrl}/lyric?id=${songId}`);
      
      if (!response.ok) {
        throw new Error(`歌词请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code === 200) {
        const result = {
          lrc: null,
          tlyric: null,
          romalrc: null
        };

        // 原文歌词
        if (data.lrc && data.lrc.lyric) {
          result.lrc = data.lrc.lyric;
        }

        // 翻译歌词
        if (data.tlyric && data.tlyric.lyric) {
          result.tlyric = data.tlyric.lyric;
        }

        // 罗马音歌词
        if (data.romalrc && data.romalrc.lyric) {
          result.romalrc = data.romalrc.lyric;
        }

        return result;
      }
      
      throw new Error('获取歌词失败');
    } catch (error) {
      console.error('获取歌词失败:', error);
      return null;
    }
  }

  // 搜索歌词（组合搜索+获取歌词）
  async searchLyrics(songName, artist, limit = 10) {
    try {
      const keyword = `${songName} ${artist || ''}`.trim();
      const songs = await this.searchSongs(keyword, limit);
      
      console.log(`开始获取 ${songs.length} 首歌曲的歌词`);
      const results = [];
      
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        try {
          console.log(`正在获取第 ${i+1}/${songs.length} 首歌曲的歌词: ${song.name} - ${song.artist} (ID: ${song.id})`);
          const lyrics = await this.getLyrics(song.id);
          
          if (lyrics && lyrics.lrc) {
            console.log(`歌曲 "${song.name}" 歌词长度: ${lyrics.lrc.length}, 前100字符: ${lyrics.lrc.substring(0, 100)}`);
            
            if (lyrics.lrc.trim()) {
              console.log(`歌词包含检查 - 作词: ${lyrics.lrc.includes('作词')}, 作曲: ${lyrics.lrc.includes('作曲')}, 编曲: ${lyrics.lrc.includes('编曲')}, 长度: ${lyrics.lrc.length}`);
              
              // 放宽过滤条件，添加更多调试信息
              if (lyrics.lrc.length > 20) { // 降低长度要求到20
                // 检查是否主要是信息性内容
                const infoLines = lyrics.lrc.split('\n').filter(line => 
                  line.includes('作词') || line.includes('作曲') || line.includes('编曲') || line.includes('制作人') || line.includes('出品')
                );
                const totalLines = lyrics.lrc.split('\n').length;
                const infoRatio = infoLines.length / totalLines;
                
                console.log(`歌词信息比例: ${infoRatio} (${infoLines.length}/${totalLines})`);
                
                // 如果信息性内容占比小于50%，认为是有效歌词
                if (infoRatio < 0.5) {
                  results.push({
                    platform: 'netease-api',
                    platformName: '网易云音乐 (官方API)',
                    song: song.name,
                    artist: song.artist,
                    lyrics: lyrics.lrc,
                    translation: lyrics.tlyric,
                    romaLyrics: lyrics.romalrc,
                    duration: this.formatDuration(song.duration),
                    songId: song.id,
                    quality: 100 // 官方API质量最高
                  });
                  
                  console.log(`✓ 歌曲 "${song.name}" 歌词添加成功`);
                } else {
                  console.log(`✗ 歌曲 "${song.name}" 歌词被过滤：信息性内容占比过高`);
                }
              } else {
                console.log(`✗ 歌曲 "${song.name}" 歌词被过滤：长度不足 (${lyrics.lrc.length} <= 20)`);
              }
            } else {
              console.log(`✗ 歌曲 "${song.name}" 歌词为空`);
            }
          } else {
            console.log(`✗ 歌曲 "${song.name}" 未获取到歌词`);
          }
          
          // 添加延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`获取歌曲 "${song.name}" 歌词失败:`, error);
        }
      }
      
      console.log(`歌词搜索完成，共获得 ${results.length} 个有效结果`);
      return results;
    } catch (error) {
      console.error('搜索歌词失败:', error);
      return [];
    }
  }

  // 格式化时长
  formatDuration(ms) {
    if (!ms) return '未知时长';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// 导出实例
const neteaseAPI = new NeteaseAPI(); 