// 网易云音乐API模块
class NeteaseAPI {
  constructor() {
    this.loadConfig();
    this.enabled = true;
    this.isModuleMode = true; // 使用模块调用模式
  }

  // 从设置中加载配置
  loadConfig() {
    try {
      const settings = new Settings();
      const neteaseApiSettings = settings.get('neteaseApi', {});
      
      this.enabled = neteaseApiSettings.enabled !== false;
      
      console.log(`网易云API配置: 模块调用模式, 启用状态: ${this.enabled}`);
    } catch (error) {
      console.warn('加载网易云API配置失败，使用默认配置:', error.message);
      this.enabled = true;
    }
  }
  
  // 更新配置
  updateConfig() {
    this.loadConfig();
  }

  // 检查API模块状态
  async checkModuleStatus() {
    try {
      // 检查是否可以调用网易云API模块
      if (window.electronAPI && window.electronAPI.callNeteaseApi) {
        const response = await window.electronAPI.callNeteaseApi('banner', { type: 0 });
        const result = response.success ? response.data : null;
        return result && result.status === 200;
      }
      return false;
    } catch (error) {
      console.error('检查网易云API模块状态失败:', error);
      return false;
    }
  }

  // 搜索歌曲
  async searchSongs(keyword, limit = 20) {
    try {
      if (!this.enabled) {
        throw new Error('网易云API已禁用');
      }

      console.log(`开始搜索歌曲: ${keyword}`);
      
      // 通过Electron主进程调用网易云API模块
      const response = await window.electronAPI.callNeteaseApi('search', {
        keywords: keyword,
        limit: limit
      });
      
      if (!response.success) {
        throw new Error(response.error || '网易云API调用失败');
      }
      
      const result = response.data;
      console.log('搜索响应:', result);
      
      if (result.status === 200 && result.body && result.body.result && result.body.result.songs) {
        const songs = result.body.result.songs.map(song => ({
          id: song.id,
          name: song.name,
          artist: song.artists ? song.artists.map(a => a.name).join('/') : '未知艺术家',
          album: song.album ? song.album.name : '未知专辑',
          duration: song.duration || 0
        }));
        
        console.log(`搜索成功，找到 ${songs.length} 首歌曲`);
        return songs;
      }
      
      console.warn('搜索结果格式异常:', result);
      return [];
    } catch (error) {
      console.error('搜索歌曲失败:', error);
      throw error;
    }
  }

  // 获取歌词
  async getLyrics(songId) {
    try {
      if (!this.enabled) {
        throw new Error('网易云API已禁用');
      }

      const response = await window.electronAPI.callNeteaseApi('lyric', { id: songId });
      
      if (!response.success) {
        throw new Error(response.error || '网易云API调用失败');
      }
      
      const result = response.data;
      
      if (result.status === 200 && result.body) {
        const data = result.body;
        const lyrics = {
          lrc: null,
          tlyric: null,
          romalrc: null
        };

        // 原文歌词
        if (data.lrc && data.lrc.lyric) {
          lyrics.lrc = data.lrc.lyric;
        }

        // 翻译歌词
        if (data.tlyric && data.tlyric.lyric) {
          lyrics.tlyric = data.tlyric.lyric;
        }

        // 罗马音歌词
        if (data.romalrc && data.romalrc.lyric) {
          lyrics.romalrc = data.romalrc.lyric;
        }

        return lyrics;
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