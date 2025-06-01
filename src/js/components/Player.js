// 播放器组件
class Player {
  constructor() {
    this.audio = document.getElementById('audioPlayer');
    this.api = new BilibiliAPI();
    this.settings = new Settings();
    this.historyDB = new HistoryDB(); // 使用新的历史记录数据库
    this.pageSelector = new PageSelector(); // 初始化分P选择器
    this.lyricsSettings = new LyricsSettings(); // 初始化歌词设置
    this.lyricsDB = new LyricsDB(); // 初始化歌词数据库
    
    // 播放器元素
    this.playerBar = document.getElementById('playerBar');
    this.coverImage = document.getElementById('coverImage');
    this.songTitle = document.getElementById('songTitle');
    this.songArtist = document.getElementById('songArtist');
    this.playBtn = document.getElementById('playBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.progressBar = document.getElementById('progressBar');
    this.currentTime = document.getElementById('currentTime');
    this.totalTime = document.getElementById('totalTime');
    this.volumeBtn = document.getElementById('volumeBtn');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.volumeSliderContainer = document.getElementById('volumeSliderContainer');
    this.modeBtn = document.getElementById('modeBtn');
    this.expandBtn = document.getElementById('expandBtn');
    this.lyricsSettingsBtn = document.getElementById('lyricsSettingsBtn'); // 歌词设置按钮
    
    // 播放列表面板元素
    this.playlistBtn = document.getElementById('playlistBtn');
    this.playlistPanel = document.getElementById('playlistPanel');
    this.playlistCount = document.getElementById('playlistCount');
    this.clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
    this.closePanelBtn = document.getElementById('closePanelBtn');
    this.playlistPanelContent = document.getElementById('playlistPanelContent');
    
    // 模态框元素
    this.playerModal = document.getElementById('playerModal');
    this.modalCoverImage = document.getElementById('modalCoverImage');
    this.modalSongTitle = document.getElementById('modalSongTitle');
    this.modalSongArtist = document.getElementById('modalSongArtist');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.lyricsContent = document.getElementById('lyricsContent');
    
    // 播放状态
    this.currentSong = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.duration = 0;
    this.currentTimeValue = 0;
    this.volume = 100;
    this.playMode = 'sequence'; // sequence, random, repeat
    this.isModalOpen = false;
    this.isPanelOpen = false;
    this.isListenPlaylist = false; // 标记是否为试听歌单
    
    // 歌词相关状态
    this.currentLyricsLines = null;
    this.currentLyricsIndex = 0;
    this.savedLyrics = null; // 保存的歌词内容
    this.savedLyricsSettings = null; // 保存的歌词设置
    this.currentSongLyrics = null; // 当前歌曲的歌词数据
    this.lyricsOffset = 0; // 歌词偏移时间（秒），正数表示歌词延迟，负数表示歌词提前
    
    // 歌词滚动相关状态
    this.isUserScrolling = false;
    this.userScrollTimer = null;
    this.scrollListener = null;
    this.touchListener = null;
    this.wheelListener = null;
    this.lastUserScrollTime = 0;
    
    // API 实例
    this.translationAPI = null; // 翻译API实例
    
    // 默认歌词设置
    this.defaultLyricsSettings = {
      fontSize: 16,
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      fontFamily: 'Microsoft YaHei, sans-serif',
      lineHeight: 1.5,
      platform: 'netease' // 默认网易云
    };
    
    this.init();
  }

  async init() {
    this.bindEvents();
    this.loadSettings();
    this.setupAudio();
    this.loadLyricsSettings(); // 加载歌词设置
    this.loadLyricsOffset(); // 加载歌词偏移设置
    this.fixCorruptedLyricsData(); // 修复损坏的歌词数据
    this.initTrayListeners(); // 初始化托盘事件监听
    
    // 初始化历史记录数据库
    try {
      await this.historyDB.init();
      console.log('播放器历史记录数据库初始化成功');
    } catch (error) {
      console.error('播放器历史记录数据库初始化失败:', error);
    }
  }

  bindEvents() {
    // 播放控制
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.prevBtn.addEventListener('click', () => this.playPrevious());
    this.nextBtn.addEventListener('click', () => this.playNext());
    
    // 进度控制
    this.progressBar.addEventListener('input', (e) => {
      this.seek(e.target.value);
    });
    
    // 音量控制
    this.volumeSlider.addEventListener('input', (e) => {
      this.setVolume(e.target.value);
    });
    
    this.volumeBtn.addEventListener('click', () => {
      this.toggleMute();
    });
    
    // 播放模式
    this.modeBtn.addEventListener('click', () => {
      this.togglePlayMode();
    });
    
    // 展开播放界面
    this.expandBtn.addEventListener('click', () => {
      this.openModal();
    });
    
    // 歌词设置
    this.lyricsSettingsBtn.addEventListener('click', () => {
      const songInfo = this.currentSong ? {
        title: this.getOriginalTitle(this.currentSong.title),
        artist: this.currentSong.owner?.name || this.currentSong.uploader || 'UP主'
      } : null;
      this.lyricsSettings.open(songInfo);
    });
    
    // 播放列表面板
    this.playlistBtn.addEventListener('click', () => {
      this.togglePlaylistPanel();
    });
    
    this.clearPlaylistBtn.addEventListener('click', () => {
      this.clearPlaylist();
    });
    
    this.closePanelBtn.addEventListener('click', () => {
      this.closePlaylistPanel();
    });
    
    // 关闭播放界面
    this.closeModalBtn.addEventListener('click', () => {
      this.closeModal();
    });
    
    // 音频事件
    this.audio.addEventListener('loadstart', () => this.onLoadStart());
    this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
    this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('error', (e) => this.onError(e));
    this.audio.addEventListener('canplay', () => this.onCanPlay());
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (!e.target.matches('input, textarea')) {
        switch (e.code) {
          case 'Space':
            e.preventDefault();
            this.togglePlay();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            this.seek(Math.max(0, this.currentTimeValue - 10));
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.seek(Math.min(this.duration, this.currentTimeValue + 10));
            break;
          case 'ArrowUp':
            e.preventDefault();
            this.setVolume(Math.min(100, this.volume + 10));
            break;
          case 'ArrowDown':
            e.preventDefault();
            this.setVolume(Math.max(0, this.volume - 10));
            break;
        }
      }
    });

    // 点击封面打开模态框
    this.coverImage.parentElement.addEventListener('click', () => {
      if (this.currentSong) {
        this.openModal();
      }
    });
    
    // 监听歌词设置更新事件
    window.addEventListener('lyricsSettingsUpdate', (e) => {
      this.updateLyricsDisplay(e.detail);
    });
  }

  setupAudio() {
    this.audio.volume = this.volume / 100;
    this.volumeSlider.value = this.volume;
    this.updateVolumeProgress();
    this.updateVolumeIcon();
    this.updateModeIcon();
  }

  loadSettings() {
    const settings = this.settings.get();
    this.volume = settings.volume;
    this.playMode = settings.playMode;
  }

  // 加载歌词设置
  loadLyricsSettings() {
    // 获取已保存的歌词设置
    const lyricsSettings = this.settings.get('lyricsSettings');
    
    if (lyricsSettings) {
      // 只应用歌词设置，不加载歌词内容
      this.savedLyricsSettings = lyricsSettings;
      console.log('歌词设置已加载:', this.savedLyricsSettings);
    } else {
      // 如果没有保存的设置，使用默认设置
      this.savedLyricsSettings = this.defaultLyricsSettings;
      console.log('使用默认歌词设置:', this.savedLyricsSettings);
    }
  }

  // 播放歌曲
  async playSong(song, playlist = [], index = 0) {
    try {
      // 检查是否为分P视频
      let selectedCid = song.cid;
      let currentSong = song; // 当前要播放的歌曲对象
      
      // 如果歌曲已经有pageInfo（说明是从分P列表选择的），直接使用
      if (song.pageInfo) {
        selectedCid = song.cid;
        currentSong = song;
      } else {
        // 否则检查是否需要获取分P信息
        if (!song.pages) {
          // 如果没有pages信息，先获取视频详细信息
          try {
            const videoInfo = await this.api.getVideoInfo(song.bvid);
            song.pages = videoInfo.pages;
          } catch (error) {
            console.warn('获取视频分P信息失败:', error);
          }
        }
        
        // 如果是分P视频且没有预选的分P，弹出选择窗口
        if (song.pages && song.pages.length > 1) {
          try {
            const selection = await this.pageSelector.show(song.pages);
            selectedCid = selection.cid;
            
            // 为选中的分P创建独立的歌曲对象
            currentSong = {
              ...song, // 继承原歌曲的所有属性
              title: `${this.getOriginalTitle(song.title)} (P${selection.index + 1}: ${selection.page.part})`,
              cid: selectedCid,
              pageInfo: {
                index: selection.index,
                part: selection.page.part,
                duration: selection.page.duration
              }
            };
          } catch (error) {
            // 用户取消选择
            this.hideLoading();
            return;
          }
        }
      }
      
      // 设置当前播放的歌曲（使用独立的歌曲对象）
      this.currentSong = currentSong;
      this.playlist = playlist;
      this.currentIndex = index;
      
      // 更新 UI
      this.updateSongInfo();
      this.showLoading();
      
      // 获取音频流
      const audioData = await this.api.getAudioUrl(currentSong.bvid, selectedCid);
      
      // 尝试加载音频
      await this.tryLoadAudioUrls(audioData.all_urls || [audioData.url]);
      
      // 记录播放历史
      try {
        // 确保duration是有效数字
        let duration = 0;
        
        if (currentSong.duration) {
          // 如果是字符串格式（如"3:45"），转换为秒数
          if (typeof currentSong.duration === 'string' && currentSong.duration.includes(':')) {
            const parts = currentSong.duration.split(':');
            if (parts.length === 2) {
              const minutes = parseInt(parts[0]) || 0;
              const seconds = parseInt(parts[1]) || 0;
              duration = minutes * 60 + seconds;
            } else if (parts.length === 3) {
              // 支持 "1:23:45" 格式（小时:分钟:秒）
              const hours = parseInt(parts[0]) || 0;
              const minutes = parseInt(parts[1]) || 0;
              const seconds = parseInt(parts[2]) || 0;
              duration = hours * 3600 + minutes * 60 + seconds;
            }
          } 
          // 如果是数字格式，直接使用
          else if (!isNaN(Number(currentSong.duration))) {
            duration = Number(currentSong.duration);
          }
        }
        
        // 如果duration仍然是0，尝试从音频元素获取
        if (duration === 0 && this.audio && this.audio.duration && !isNaN(this.audio.duration)) {
          duration = Math.floor(this.audio.duration);
        }
        
        await this.historyDB.add({
          bvid: currentSong.bvid,
          title: currentSong.title,
          author: currentSong.author || currentSong.owner?.name || currentSong.uploader || 'UP主',
          cover: currentSong.pic || currentSong.cover,
          duration: duration,
          cid: selectedCid
        });
        console.log('播放历史记录已添加，duration:', duration, 'original:', currentSong.duration);
      } catch (error) {
        console.error('添加播放历史失败:', error);
      }
      
      // 更新播放列表面板（如果面板是打开状态）
      if (this.isPanelOpen) {
        this.updatePlaylistPanel();
      }
      
      // 加载当前歌曲的歌词偏移设置
      this.loadLyricsOffset();
      
      // 更新托盘菜单
      this.updateTrayMenu();
      
    } catch (error) {
      console.error('播放失败:', error);
      this.showError('播放失败：' + error.message);
    }
  }

  // 获取原始标题（去除之前添加的分P信息）
  getOriginalTitle(title) {
    // 移除之前可能添加的分P信息，如 " (P1: xxx)" 或 " (P2: yyy)"
    return title.replace(/\s*\(P\d+:.*?\)$/, '');
  }

  // 尝试加载多个音频URL
  async tryLoadAudioUrls(urls) {
    for (let i = 0; i < urls.length; i++) {
      try {
        await this.loadAudioUrl(urls[i]);
        console.log(`成功加载音频URL (${i + 1}/${urls.length}):`, urls[i]);
        return;
      } catch (error) {
        console.warn(`音频URL ${i + 1} 加载失败:`, error);
        if (i === urls.length - 1) {
          throw new Error('所有音频URL都无法加载');
        }
      }
    }
  }

  // 加载单个音频URL
  loadAudioUrl(url) {
    return new Promise((resolve, reject) => {
      // 清理之前的音频
      this.audio.src = '';
      this.audio.load();
      
      // 设置新的音频源
      this.audio.src = url;
      
      // 监听加载事件
      const onCanPlay = () => {
        cleanup();
        resolve();
      };
      
      const onError = (e) => {
        cleanup();
        reject(new Error('音频加载失败'));
      };
      
      const cleanup = () => {
        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.removeEventListener('error', onError);
      };
      
      this.audio.addEventListener('canplay', onCanPlay);
      this.audio.addEventListener('error', onError);
      
      // 开始加载
      this.audio.load();
    });
  }

  // 切换播放/暂停
  togglePlay() {
    if (!this.currentSong) return;
    
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  // 播放
  async play() {
    try {
      await this.audio.play();
      this.isPlaying = true;
      this.updatePlayButton();
      this.updateTrayMenu(); // 更新托盘菜单
    } catch (error) {
      console.error('播放失败:', error);
      this.showError('播放失败');
    }
  }

  // 暂停
  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.updatePlayButton();
    this.updateTrayMenu(); // 更新托盘菜单
  }

  // 上一首
  async playPrevious() {
    if (this.playlist.length === 0) return;
    
    // 如果是试听歌单且只有一首歌，重新播放当前歌曲
    if (this.isListenPlaylist && this.playlist.length === 1) {
      this.seek(0);
      this.play();
      return;
    }
    
    let newIndex;
    if (this.playMode === 'random') {
      // 随机模式下避免选择当前歌曲
      do {
        newIndex = Math.floor(Math.random() * this.playlist.length);
      } while (newIndex === this.currentIndex && this.playlist.length > 1);
    } else {
      newIndex = this.currentIndex - 1;
      if (newIndex < 0) {
        newIndex = this.playlist.length - 1;
      }
    }
    
    this.currentIndex = newIndex;
    await this.playSong(this.playlist[newIndex], this.playlist, newIndex);
  }

  // 下一首
  async playNext() {
    if (this.playlist.length === 0) return;
    
    // 如果是试听歌单且只有一首歌，重新播放当前歌曲
    if (this.isListenPlaylist && this.playlist.length === 1) {
      this.seek(0);
      this.play();
      return;
    }
    
    let newIndex;
    if (this.playMode === 'random') {
      // 随机模式下避免选择当前歌曲
      do {
        newIndex = Math.floor(Math.random() * this.playlist.length);
      } while (newIndex === this.currentIndex && this.playlist.length > 1);
    } else {
      newIndex = this.currentIndex + 1;
      if (newIndex >= this.playlist.length) {
        newIndex = 0;
      }
    }
    
    this.currentIndex = newIndex;
    await this.playSong(this.playlist[newIndex], this.playlist, newIndex);
  }

  // 跳转到指定时间
  seek(time) {
    this.audio.currentTime = time;
    this.currentTimeValue = time;
    this.updateProgress();
  }

  // 设置音量
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, volume));
    this.audio.volume = this.volume / 100;
    this.volumeSlider.value = this.volume;
    
    // 更新音量进度样式
    this.updateVolumeProgress();
    
    this.updateVolumeIcon();
    this.settings.set('volume', this.volume);
  }

  // 更新音量进度显示
  updateVolumeProgress() {
    // 更新CSS变量来显示音量进度
    document.documentElement.style.setProperty('--volume-progress', `${this.volume}%`);
    
    // 更新或创建音量数值显示
    let volumeDisplay = this.volumeSlider.parentElement.querySelector('.volume-display');
    if (!volumeDisplay) {
      volumeDisplay = document.createElement('div');
      volumeDisplay.className = 'volume-display';
      this.volumeSlider.parentElement.appendChild(volumeDisplay);
    }
    volumeDisplay.textContent = `${Math.round(this.volume)}%`;
  }

  // 切换静音
  toggleMute() {
    if (this.audio.volume > 0) {
      this.previousVolume = this.volume;
      this.setVolume(0);
    } else {
      this.setVolume(this.previousVolume || 50);
    }
  }

  // 切换播放模式
  togglePlayMode() {
    const modes = ['sequence', 'random', 'repeat'];
    const currentIndex = modes.indexOf(this.playMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.playMode = modes[nextIndex];
    this.updateModeIcon();
    this.settings.set('playMode', this.playMode);
  }

  // 更新歌词显示
  updateLyricsDisplay(detail) {
    const { settings, lyrics } = detail;
    
    // 保存歌词设置到实例变量
    this.savedLyricsSettings = settings;
    console.log('歌词设置已更新:', this.savedLyricsSettings);
    
    // 保存歌词设置到localStorage
    if (settings) {
      this.settings.set('lyricsSettings', settings);
    }
    
    // 如果有歌词内容，保存到当前歌曲的歌词数据
    if (lyrics && this.currentSong) {
      // 确保歌词是字符串类型
      this.savedLyrics = typeof lyrics === 'string' ? lyrics : '';
      
      // 保存歌词到数据库
      this.saveLyricsToDatabase(this.savedLyrics);
    }
    
    // 立即应用到模态框（如果存在）
    this.applyLyricsToModal();
  }
  
  // 保存歌词到数据库
  async saveLyricsToDatabase(lyrics) {
    if (!this.currentSong || !this.lyricsDB) {
      return;
    }
    
    try {
      const title = this.getOriginalTitle(this.currentSong.title);
      const artist = this.currentSong.author || this.currentSong.owner?.name || this.currentSong.uploader || 'UP主';
      
      // 确保歌词是字符串类型
      const lyricsText = typeof lyrics === 'string' ? lyrics : (lyrics?.lyrics || '');
      
      await this.lyricsDB.saveLyrics(
        title,
        artist,
        {
          lyrics: lyricsText,
          platform: 'settings',
          platformName: '歌词设置',
          quality: 80 // 通过设置保存的歌词给较高质量评分
        }
      );
    } catch (error) {
      console.error('保存歌词到数据库失败:', error);
    }
  }
  
  // 应用歌词到模态框
  applyLyricsToModal() {
    // 重新获取歌词内容容器（确保获取到最新的元素）
    const lyricsContent = document.getElementById('lyricsContent');
    
    if (!lyricsContent) {
      console.log('applyLyricsToModal: lyricsContent元素不存在');
      return;
    }
    
    console.log('applyLyricsToModal: 开始应用歌词', {
      savedLyrics: this.savedLyrics,
      currentSongLyrics: this.currentSongLyrics
    });

    // 如果有保存的歌词设置，应用样式
    if (this.savedLyricsSettings) {
      lyricsContent.style.fontSize = this.savedLyricsSettings.fontSize + 'px';
      lyricsContent.style.color = this.savedLyricsSettings.color;
      lyricsContent.style.backgroundColor = this.savedLyricsSettings.backgroundColor;
      lyricsContent.style.fontFamily = this.savedLyricsSettings.fontFamily;
      lyricsContent.style.lineHeight = this.savedLyricsSettings.lineHeight;
      lyricsContent.style.padding = '20px';
      lyricsContent.style.borderRadius = '8px';
    }

    // 获取歌词内容，优先使用savedLyrics，其次使用currentSongLyrics
    let lyricsToDisplay = '';

    if (this.savedLyrics && typeof this.savedLyrics === 'string' && this.savedLyrics.trim()) {
      lyricsToDisplay = this.savedLyrics;
      console.log('applyLyricsToModal: 使用savedLyrics');
    } else if (this.currentSongLyrics && this.currentSongLyrics.lyrics) {
      // 确保从数据库获取的歌词也是字符串类型
      const lyricsFromDB = this.currentSongLyrics.lyrics;
      lyricsToDisplay = typeof lyricsFromDB === 'string' ? lyricsFromDB : '';
      
      // 同时更新savedLyrics以保持一致
      this.savedLyrics = lyricsToDisplay;
      console.log('applyLyricsToModal: 使用currentSongLyrics从数据库');
    }
    
    console.log('applyLyricsToModal: 最终歌词内容', lyricsToDisplay);

    // 显示歌词或默认文本，确保lyricsToDisplay是字符串
    if (lyricsToDisplay && typeof lyricsToDisplay === 'string' && lyricsToDisplay.trim()) {
      this.displayLyrics(lyricsToDisplay);
      console.log('applyLyricsToModal: 调用displayLyrics显示歌词');
    } else {
      lyricsContent.innerHTML = '<p>暂无歌词</p>';
      console.log('applyLyricsToModal: 显示"暂无歌词"');
    }
  }
  
  // 打开模态框
  openModal() {
    if (this.isModalOpen) return;
    
    this.isModalOpen = true;
    this.playerModal.classList.add('show');
    this.updateModalInfo();
    
    // 等待DOM更新后再应用歌词
    setTimeout(() => {
      // 重新获取歌词内容容器（因为模态框可能是动态创建的）
      this.lyricsContent = document.getElementById('lyricsContent');
      
      // 应用保存的歌词设置和内容
      this.applyLyricsToModal();
    }, 100);
    
    document.body.style.overflow = 'hidden';
  }

  // 关闭播放模态框
  closeModal() {
    this.isModalOpen = false;
    this.playerModal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 清理歌词滚动事件监听器
    const lyricsContainer = document.querySelector('.lyrics-container');
    if (lyricsContainer && this.scrollListener) {
      lyricsContainer.removeEventListener('scroll', this.scrollListener);
      lyricsContainer.removeEventListener('touchstart', this.touchListener);
      lyricsContainer.removeEventListener('wheel', this.wheelListener);
    }
    
    // 清理定时器
    if (this.userScrollTimer) {
      clearTimeout(this.userScrollTimer);
      this.userScrollTimer = null;
    }
    
    // 重置滚动状态
    this.isUserScrolling = false;
  }

  // 音频事件处理
  onLoadStart() {
    this.hideError();
  }

  onLoadedMetadata() {
    this.duration = this.audio.duration;
    this.progressBar.max = this.duration;
    this.totalTime.textContent = this.formatTime(this.duration);
    this.hideLoading();
  }

  onTimeUpdate() {
    this.currentTimeValue = this.audio.currentTime;
    this.updateProgress();
    // 更新歌词显示
    console.log('TimeUpdate事件触发，当前时间:', this.currentTimeValue, '歌词行数:', this.currentLyricsLines?.length);
    this.updateCurrentLyricsLine();
  }

  async onEnded() {
    if (this.playMode === 'repeat') {
      this.audio.currentTime = 0;
      this.play();
    } else if (this.settings.get('autoPlay', true)) {
      await this.playNext();
    } else {
      this.isPlaying = false;
      this.updatePlayButton();
    }
  }

  onCanPlay() {
    if (this.settings.get('autoPlay', true)) {
      this.play();
    }
  }

  onError(error) {
    console.error('音频加载错误:', error);
    this.showError('音频加载失败');
    this.hideLoading();
  }

  // UI 更新方法
  updateSongInfo() {
    if (!this.currentSong) return;
    
    this.songTitle.textContent = this.currentSong.title;
    this.songArtist.textContent = this.currentSong.author;
    
    // 加载封面
    this.loadCover(this.currentSong.cover);
    
    // 如果播放界面模态框已经打开，同时更新模态框信息
    if (this.isModalOpen) {
      this.updateModalInfo();
    }
    
    // 自动加载歌词
    this.loadCurrentSongLyrics();
  }

  updateModalInfo() {
    if (!this.currentSong) return;
    
    this.modalSongTitle.textContent = this.currentSong.title;
    this.modalSongArtist.textContent = this.currentSong.author;
    
    // 重置封面加载状态
    this.modalCoverImage.classList.remove('loaded');
    this.modalCoverImage.src = this.currentSong.cover;
    this.modalCoverImage.onload = () => {
      this.modalCoverImage.classList.add('loaded');
    };
    this.modalCoverImage.onerror = () => {
      this.modalCoverImage.classList.remove('loaded');
    };
  }

  updatePlayButton() {
    const playIcon = this.playBtn.querySelector('.play-icon');
    const pauseIcon = this.playBtn.querySelector('.pause-icon');
    
    if (this.isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  updateProgress() {
    this.progressBar.value = this.currentTimeValue;
    this.currentTime.textContent = this.formatTime(this.currentTimeValue);
    
    // 更新进度条样式
    const progressPercent = this.duration > 0 ? (this.currentTimeValue / this.duration) * 100 : 0;
    document.documentElement.style.setProperty('--progress-value', `${progressPercent}%`);
  }

  updateVolumeIcon() {
    const volumeOn = this.volumeBtn.querySelector('.volume-on');
    const volumeOff = this.volumeBtn.querySelector('.volume-off');
    
    if (this.volume > 0) {
      volumeOn.style.display = 'block';
      volumeOff.style.display = 'none';
    } else {
      volumeOn.style.display = 'none';
      volumeOff.style.display = 'block';
    }
  }

  updateModeIcon() {
    const sequenceIcon = this.modeBtn.querySelector('.sequence-icon');
    const randomIcon = this.modeBtn.querySelector('.random-icon');
    const repeatIcon = this.modeBtn.querySelector('.repeat-icon');
    
    sequenceIcon.style.display = 'none';
    randomIcon.style.display = 'none';
    repeatIcon.style.display = 'none';
    
    this.modeBtn.dataset.mode = this.playMode;
    
    switch (this.playMode) {
      case 'sequence':
        sequenceIcon.style.display = 'block';
        break;
      case 'random':
        randomIcon.style.display = 'block';
        break;
      case 'repeat':
        repeatIcon.style.display = 'block';
        break;
    }
  }

  loadCover(coverUrl) {
    this.coverImage.src = coverUrl;
    this.coverImage.onload = () => {
      this.coverImage.classList.add('loaded');
    };
    this.coverImage.onerror = () => {
      this.coverImage.classList.remove('loaded');
    };
  }

  showLoading() {
    // 可以添加加载动画
  }

  hideLoading() {
    // 隐藏加载动画
  }

  showError(message) {
    console.error(message);
    // 可以添加错误提示 UI
  }

  hideError() {
    // 隐藏错误提示
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // 获取当前播放状态
  getState() {
    return {
      currentSong: this.currentSong,
      playlist: this.playlist,
      currentIndex: this.currentIndex,
      isPlaying: this.isPlaying,
      currentTime: this.currentTimeValue,
      duration: this.duration,
      volume: this.volume,
      playMode: this.playMode
    };
  }

  // 播放列表面板方法
  togglePlaylistPanel() {
    if (this.isPanelOpen) {
      this.closePlaylistPanel();
    } else {
      this.openPlaylistPanel();
    }
  }

  openPlaylistPanel() {
    this.isPanelOpen = true;
    this.playlistPanel.classList.add('show');
    this.playlistBtn.classList.add('active');
    this.updatePlaylistPanel();
  }

  closePlaylistPanel() {
    this.isPanelOpen = false;
    this.playlistPanel.classList.remove('show');
    this.playlistBtn.classList.remove('active');
  }

  updatePlaylistPanel() {
    this.updatePlaylistCount();
    this.renderPlaylistItems();
  }

  updatePlaylistCount() {
    const count = this.playlist.length;
    this.playlistCount.textContent = `${count}首歌曲`;
  }

  renderPlaylistItems() {
    if (this.playlist.length === 0) {
      this.showEmptyPlaylist();
      return;
    }

    // 保存当前滚动位置
    const scrollTop = this.playlistPanelContent.scrollTop;

    const fragment = document.createDocumentFragment();
    
    this.playlist.forEach((song, index) => {
      const item = this.createPlaylistItem(song, index);
      fragment.appendChild(item);
    });

    this.playlistPanelContent.innerHTML = '';
    this.playlistPanelContent.appendChild(fragment);
    
    // 恢复滚动位置
    this.playlistPanelContent.scrollTop = scrollTop;
  }

  createPlaylistItem(song, index) {
    const item = document.createElement('div');
    item.className = 'playlist-item-panel';
    item.dataset.index = index;
    
    if (index === this.currentIndex) {
      item.classList.add('current');
    }

    item.innerHTML = `
      <div class="playlist-item-index">${index + 1}</div>
      <div class="playlist-item-cover">
        <img src="${song.cover}" alt="封面" loading="lazy">
        <div class="cover-placeholder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
      </div>
      <div class="playlist-item-info">
        <div class="playlist-item-title">${song.title}</div>
        <div class="playlist-item-artist">${song.author}</div>
      </div>
      <div class="playlist-item-duration">${song.duration || ''}</div>
      <button class="playlist-item-remove" title="移除">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `;

    // 绑定事件
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.playlist-item-remove')) {
        this.playFromPlaylist(index);
      }
    });

    const removeBtn = item.querySelector('.playlist-item-remove');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeFromPlaylist(index);
    });

    return item;
  }

  showEmptyPlaylist() {
    this.playlistPanelContent.innerHTML = `
      <div class="playlist-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
        </svg>
        <p>播放列表为空</p>
      </div>
    `;
  }

  async playFromPlaylist(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.currentIndex = index;
      await this.playSong(this.playlist[index], this.playlist, index);
      this.updatePlaylistPanel();
    }
  }

  removeFromPlaylist(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.playlist.splice(index, 1);
      
      // 调整当前播放索引
      if (this.currentIndex > index) {
        this.currentIndex--;
      } else if (this.currentIndex === index) {
        // 如果删除的是当前播放的歌曲
        if (this.playlist.length === 0) {
          this.currentSong = null;
          this.currentIndex = 0;
          this.audio.src = '';
          this.updateSongInfo();
        } else if (this.currentIndex >= this.playlist.length) {
          this.currentIndex = 0;
        }
      }
      
      this.updatePlaylistPanel();
    }
  }

  clearPlaylist() {
    if (this.playlist.length === 0) return;
    
    // 如果是试听歌单，保留当前播放的歌曲
    if (this.isListenPlaylist && this.currentSong) {
      this.playlist = [this.currentSong];
      this.currentIndex = 0;
    } else {
      this.playlist = [];
      this.currentIndex = 0;
      this.currentSong = null;
      this.audio.src = '';
      this.updateSongInfo();
    }
    
    this.updatePlaylistPanel();
  }

  // 创建试听歌单
  createListenPlaylist(song) {
    this.isListenPlaylist = true;
    this.playlist = [song];
    this.currentIndex = 0;
  }

  // 添加歌曲到试听歌单
  addToListenPlaylist(song) {
    if (!this.isListenPlaylist) {
      this.createListenPlaylist(song);
      return 0;
    }
    
    // 检查歌曲是否已存在（考虑分P信息）
    const existsIndex = this.playlist.findIndex(item => {
      // 如果都有pageInfo，比较bvid和cid
      if (item.pageInfo && song.pageInfo) {
        return item.bvid === song.bvid && item.cid === song.cid;
      }
      // 如果都没有pageInfo，只比较bvid
      if (!item.pageInfo && !song.pageInfo) {
        return item.bvid === song.bvid;
      }
      // 如果一个有pageInfo一个没有，视为不同歌曲
      return false;
    });
    
    if (existsIndex !== -1) {
      // 如果歌曲已存在，返回现有索引
      return existsIndex;
    }
    
    // 添加新歌曲
    this.playlist.push(song);
    this.updatePlaylistPanel();
    
    // 返回新添加歌曲的索引
    return this.playlist.length - 1;
  }
  
  // HTML转义函数
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // 修复编码问题的函数
  fixEncoding(text) {
    if (!text) return '';
    
    try {
      // 尝试修复常见的编码问题
      // 如果是UTF-8编码错误显示，尝试重新解码
      if (text.includes('â') || text.includes('ã') || text.includes('Â')) {
        // 尝试将错误编码的字符转换回正确的中文
        return text
          .replace(/â/g, '')
          .replace(/ã/g, '')
          .replace(/Â/g, '')
          .replace(/\u00e2\u0080\u0099/g, '\'')
          .replace(/\u00e2\u0080\u009c/g, '"')
          .replace(/\u00e2\u0080\u009d/g, '"')
          .replace(/\u00e2\u0080\u0093/g, '–')
          .replace(/\u00e2\u0080\u0094/g, '—');
      }
      
      // 检查是否是Base64编码
      if (/^[A-Za-z0-9+/]+=*$/.test(text.trim()) && text.length > 20) {
        try {
          const decoded = atob(text);
          // 检查解码后是否包含中文字符
          if (/[\u4e00-\u9fff]/.test(decoded)) {
            return decoded;
          }
        } catch (e) {
          // 不是有效的Base64，继续原文本
        }
      }
      
      return text;
    } catch (error) {
      console.warn('修复编码失败:', error);
      return text;
    }
  }
  
  // 显示歌词
  displayLyrics(lyricsText) {
    const lyricsContent = document.getElementById('lyricsContent');
    
    if (!lyricsContent) {
      console.error('歌词容器不存在');
      return;
    }
    
    if (!lyricsText || typeof lyricsText !== 'string') {
      console.log('无效的歌词数据，显示默认文本');
      lyricsContent.innerHTML = '<div class="lyrics-display"><p class="lyrics-line">暂无歌词</p></div>';
      return;
    }
    
    // 确保歌词内容是字符串并进行清理
    let fixedLyricsText = this.fixEncoding(lyricsText.toString());
    
    console.log('开始解析歌词:', fixedLyricsText.substring(0, 200) + '...');
    
    // 解析歌词
    const lyricsLines = this.parseLyrics(fixedLyricsText);
    
    console.log('解析后的歌词行数:', lyricsLines.length);
    
    if (lyricsLines.length === 0) {
      console.log('解析后歌词行数为0，尝试显示纯文本歌词');
      // 如果没有LRC格式的歌词，尝试显示纯文本歌词
      const plainTextLines = fixedLyricsText.split('\n').filter(line => line.trim());
      if (plainTextLines.length > 0) {
        const lyricsHtml = plainTextLines
          .map((line, index) => `<p class="lyrics-line" data-index="${index}">${this.escapeHtml(line.trim())}</p>`)
          .join('');
        lyricsContent.innerHTML = `<div class="lyrics-display">${lyricsHtml}</div>`;
      } else {
        lyricsContent.innerHTML = '<div class="lyrics-display"><p class="lyrics-line">暂无歌词</p></div>';
      }
      return;
    }
    
    // 存储当前歌词行数据
    this.currentLyricsLines = lyricsLines;
    this.currentLyricsIndex = -1;
    
    // 生成歌词HTML
    const lyricsHtml = lyricsLines
      .map((line, index) => {
        return `<p class="lyrics-line" data-time="${line.time}" data-index="${index}">${this.escapeHtml(line.text)}</p>`;
      })
      .join('');
    
    lyricsContent.innerHTML = `<div class="lyrics-display">${lyricsHtml}</div>`;
    
    // 设置滚动监听器
    this.setupLyricsScrollListener();
    
    // 初始化用户滚动计时器
    this.userScrollTimer = null;
    
    // 如果当前正在播放，立即定位到当前歌词
    if (this.audio && this.audio.currentTime > 0) {
      setTimeout(() => {
        this.updateCurrentLyricsLine();
      }, 100);
    }
    
    console.log('歌词显示完成，共', lyricsLines.length, '行');
  }
  
  // 更新当前歌词行（移除renderLyricsWindow方法）
  updateCurrentLyricsLine() {
    console.log('开始更新歌词行，当前时间:', this.audio.currentTime, '歌词数据存在:', !!this.currentLyricsLines, '歌词偏移:', this.lyricsOffset);
    
    if (!this.currentLyricsLines || !this.audio.currentTime) {
      console.log('歌词更新条件不满足 - 歌词数据:', !!this.currentLyricsLines, '播放时间:', this.audio.currentTime);
      return;
    }
    
    // 应用歌词偏移：当前播放时间减去偏移量
    const adjustedTime = this.audio.currentTime - this.lyricsOffset;
    let newLyricsIndex = -1;
    
    // 找到当前时间对应的歌词行
    for (let i = 0; i < this.currentLyricsLines.length; i++) {
      if (this.currentLyricsLines[i].time <= adjustedTime) {
        newLyricsIndex = i;
      } else {
        break;
      }
    }
    
    console.log('计算歌词索引:', newLyricsIndex, '当前索引:', this.currentLyricsIndex, '调整后时间:', adjustedTime);
    
    // 从歌词内容容器中查找歌词行
    const lyricsContent = document.getElementById('lyricsContent');
    if (!lyricsContent) {
      console.log('歌词内容容器不存在');
      return;
    }
    
    const lyricsLines = lyricsContent.querySelectorAll('.lyrics-line');
    console.log('找到歌词行数量:', lyricsLines.length);
    
    // 如果歌词索引发生变化，更新高亮状态并滚动
    if (newLyricsIndex !== this.currentLyricsIndex) {
      console.log('歌词索引变化，从', this.currentLyricsIndex, '到', newLyricsIndex);
      
      // 移除所有高亮
      lyricsLines.forEach(line => line.classList.remove('current'));
      
      // 更新索引
      this.currentLyricsIndex = newLyricsIndex;
      
      // 高亮当前歌词行
      if (this.currentLyricsIndex >= 0 && lyricsLines[this.currentLyricsIndex]) {
        const currentLine = lyricsLines[this.currentLyricsIndex];
        currentLine.classList.add('current');
        
        console.log('高亮歌词行:', currentLine.textContent);
        
        // 检查是否应该滚动
        const shouldScroll = !this.isUserScrolling || (Date.now() - this.lastUserScrollTime) > 3000;
        console.log('是否应该滚动:', shouldScroll, '用户滚动状态:', this.isUserScrolling);
        
        if (shouldScroll) {
          console.log('开始自动滚动到当前歌词');
          this.autoScrollToCurrentLyrics();
        }
      }
    }
  }
  
  // 自动滚动到当前歌词位置
  autoScrollToCurrentLyrics() {
    console.log('执行自动滚动到当前歌词');
    
    // 直接查找当前高亮的歌词行
    const currentLyricsLine = document.querySelector('.lyrics-line.current');
    if (!currentLyricsLine) {
      console.log('未找到当前歌词行');
      return;
    }
    
    console.log('找到当前歌词行，准备滚动:', currentLyricsLine.textContent.substring(0, 20) + '...');
    
    // 使用 scrollIntoView 将当前歌词滚动到视图中心
    try {
      currentLyricsLine.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      console.log('scrollIntoView 执行完成');
    } catch (error) {
      console.error('scrollIntoView 失败:', error);
      
      // 备用方法：手动计算滚动位置
      const lyricsContainer = document.querySelector('.lyrics-container');
      if (lyricsContainer) {
        const containerRect = lyricsContainer.getBoundingClientRect();
        const lineRect = currentLyricsLine.getBoundingClientRect();
        const scrollTop = lyricsContainer.scrollTop;
        const relativeTop = lineRect.top - containerRect.top;
        const containerHeight = containerRect.height;
        
        const targetScrollTop = scrollTop + relativeTop - containerHeight / 2 + lineRect.height / 2;
        
        lyricsContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
        console.log('备用滚动方法执行完成');
      }
    }
  }
  
  // 监听用户滚动事件
  setupLyricsScrollListener() {
    const lyricsContainer = document.querySelector('.lyrics-container');
    if (!lyricsContainer) return;
    
    // 移除之前的事件监听器（避免重复绑定）
    if (this.scrollListener) {
      // 尝试从之前的容器中移除监听器
      const oldContainer = document.querySelector('.lyrics-container');
      if (oldContainer) {
        oldContainer.removeEventListener('scroll', this.scrollListener);
        oldContainer.removeEventListener('touchstart', this.touchListener);
        oldContainer.removeEventListener('wheel', this.wheelListener);
      }
    }
    
    // 创建滚动事件监听器（减少敏感度）
    let scrollTimeout;
    this.scrollListener = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.resetUserScrollTimer();
      }, 100); // 延迟100ms后才认为是用户滚动
    };
    
    // 创建触摸事件监听器
    this.touchListener = () => {
      this.resetUserScrollTimer();
    };
    
    // 创建鼠标滚轮事件监听器
    this.wheelListener = () => {
      this.resetUserScrollTimer();
    };
    
    // 添加事件监听器
    lyricsContainer.addEventListener('scroll', this.scrollListener, { passive: true });
    lyricsContainer.addEventListener('touchstart', this.touchListener, { passive: true });
    lyricsContainer.addEventListener('wheel', this.wheelListener, { passive: true });
    
    // 初始化状态
    this.isUserScrolling = false;
    this.lastUserScrollTime = 0;
  }

  // 重置用户滚动计时器
  resetUserScrollTimer() {
    // 记录用户最后滚动时间
    this.lastUserScrollTime = Date.now();
    
    // 标记用户正在滚动
    this.isUserScrolling = true;
    
    // 清除之前的计时器
    if (this.userScrollTimer) {
      clearTimeout(this.userScrollTimer);
    }
    
    // 设置新的计时器，1秒后回到自动滚动（进一步减少等待时间）
    this.userScrollTimer = setTimeout(() => {
      this.isUserScrolling = false;
      // 立即检查是否需要滚动到当前歌词
      this.autoScrollToCurrentLyrics();
    }, 1000); // 从2秒减少到1秒
  }

  // 解析LRC格式歌词
  parseLyrics(lyricsText) {
    if (!lyricsText) return [];
    
    const lines = lyricsText.split('\n');
    const lyricsLines = [];
    
    lines.forEach(line => {
      // 跳过空行
      if (!line.trim()) return;
      
      // 跳过元数据行（如 [ti:], [ar:], [al:], [by:] 等）
      if (line.match(/^\[(ti|ar|al|by|offset):/i)) {
        return;
      }
      
      // 匹配时间标签格式 [mm:ss.xx] 或 [mm:ss] 或 [mm:ss.xxx]
      const timeMatch = line.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1]);
        const seconds = parseInt(timeMatch[2]);
        let milliseconds = 0;
        
        // 处理毫秒部分
        if (timeMatch[3]) {
          const msStr = timeMatch[3];
          if (msStr.length === 1) {
            milliseconds = parseInt(msStr) * 100; // .x -> x00ms
          } else if (msStr.length === 2) {
            milliseconds = parseInt(msStr) * 10;  // .xx -> xx0ms
          } else {
            milliseconds = parseInt(msStr);       // .xxx -> xxxms
          }
        }
        
        const time = minutes * 60 + seconds + milliseconds / 1000;
        
        // 提取歌词文本（移除所有时间标签）
        const text = line.replace(/\[.*?\]/g, '').trim();
        if (text) {
          lyricsLines.push({ time, text });
        }
      }
    });
    
    // 按时间排序
    lyricsLines.sort((a, b) => a.time - b.time);
    
    console.log('歌词解析完成，提取到', lyricsLines.length, '行有效歌词');
    if (lyricsLines.length > 0) {
      console.log('前3行歌词示例:', lyricsLines.slice(0, 3));
    }
    
    return lyricsLines;
  }

  // 加载当前歌曲的歌词
  async loadCurrentSongLyrics() {
    if (!this.currentSong) {
      console.log('loadCurrentSongLyrics: 没有当前歌曲');
      return;
    }

    // 检查歌词数据库是否已初始化
    if (!this.lyricsDB) {
      console.warn('loadCurrentSongLyrics: 歌词数据库未初始化');
      this.currentSongLyrics = null;
      this.clearLyricsDisplay();
      return;
    }

    try {
      const title = this.getOriginalTitle(this.currentSong.title);
      const artist = this.currentSong.author || this.currentSong.owner?.name || this.currentSong.uploader || 'UP主';
      
      console.log('loadCurrentSongLyrics: 查找歌词', { title, artist });
      
      // 从数据库获取歌词
      const savedLyrics = await this.lyricsDB.getLyrics(title, artist);
      
      console.log('loadCurrentSongLyrics: 数据库查询结果', savedLyrics);
      
      if (savedLyrics) {
        this.currentSongLyrics = savedLyrics;
        
        // 应用歌词到界面
        this.applySavedLyricsToUI(savedLyrics);
        console.log('loadCurrentSongLyrics: 已应用歌词到UI');
      } else {
        this.currentSongLyrics = null;
        
        // 清除之前的歌词
        this.clearLyricsDisplay();
        console.log('loadCurrentSongLyrics: 未找到歌词，已清除显示');
      }
    } catch (error) {
      console.error('loadCurrentSongLyrics: 加载歌词失败', error);
      this.currentSongLyrics = null;
      this.clearLyricsDisplay();
    }
  }
  
  // 应用保存的歌词到UI
  applySavedLyricsToUI(lyricsData) {
    if (!lyricsData) {
      return;
    }
    
    // 确保歌词是字符串类型
    const lyricsText = lyricsData.lyrics || '';
    const safeLyricsText = typeof lyricsText === 'string' ? lyricsText : '';
    
    // 如果歌词设置窗口打开，传递歌词信息给歌词设置组件
    if (this.lyricsSettings && typeof this.lyricsSettings.setCurrentLyrics === 'function') {
      this.lyricsSettings.setCurrentLyrics(safeLyricsText);
    }
    
    // 更新保存的歌词状态，确保始终是字符串
    this.savedLyrics = safeLyricsText;
    
    // 如果模态框打开，立即应用歌词
    if (this.isModalOpen) {
      this.applyLyricsToModal();
    }
  }
  
  // 清除歌词显示
  clearLyricsDisplay() {
    this.savedLyrics = null;
    this.currentSongLyrics = null;
    
    // 如果歌词设置窗口打开，清除歌词
    if (this.lyricsSettings && typeof this.lyricsSettings.setCurrentLyrics === 'function') {
      this.lyricsSettings.setCurrentLyrics('');
    }
    
    // 如果模态框打开，显示无歌词状态
    if (this.isModalOpen) {
      const lyricsContent = document.getElementById('lyricsContent');
      if (lyricsContent) {
        lyricsContent.innerHTML = '<div class="lyrics-display"><p class="lyrics-line">暂无歌词</p></div>';
      }
    }
    
    console.log('歌词显示已清除');
  }

  // 修复损坏的歌词数据
  async fixCorruptedLyricsData() {
    try {
      // 获取所有歌词数据
      const keys = Object.keys(localStorage);
      const lyricsKeys = keys.filter(key => key.startsWith('lyrics_'));
      
      let fixedCount = 0;
      
      for (const key of lyricsKeys) {
        try {
          const data = localStorage.getItem(key);
          if (data && typeof data === 'string') {
            // 尝试解析数据
            const parsed = JSON.parse(data);
            
            // 检查是否是老格式的数据（包含无效的数据结构）
            if (parsed && (typeof parsed === 'string' || !parsed.lyrics)) {
              console.log(`发现损坏的歌词数据: ${key}`);
              localStorage.removeItem(key);
              fixedCount++;
            }
          }
        } catch (error) {
          console.log(`删除无效歌词数据: ${key}`);
          localStorage.removeItem(key);
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        console.log(`已修复 ${fixedCount} 条损坏的歌词数据`);
      }
    } catch (error) {
      console.error('修复歌词数据失败:', error);
    }
  }

  // 设置歌词偏移
  setLyricsOffset(offset) {
    this.lyricsOffset = offset;
    console.log('歌词偏移已设置为:', offset, '秒');
    
    // 立即更新歌词显示
    if (this.currentLyricsLines) {
      this.updateCurrentLyricsLine();
    }
    
    // 为当前歌曲单独保存偏移设置
    if (this.currentSong) {
      const songKey = this.generateSongKey(this.currentSong);
      this.settings.set(`lyricsOffset_${songKey}`, offset);
      console.log('歌词偏移已保存到歌曲:', songKey);
    }
  }

  // 获取歌词偏移
  getLyricsOffset() {
    return this.lyricsOffset;
  }

  // 从设置中加载歌词偏移
  loadLyricsOffset() {
    let savedOffset = 0;
    
    // 如果有当前歌曲，加载该歌曲的偏移设置
    if (this.currentSong) {
      const songKey = this.generateSongKey(this.currentSong);
      savedOffset = this.settings.get(`lyricsOffset_${songKey}`, 0);
      console.log('加载歌曲歌词偏移设置:', songKey, savedOffset);
    } else {
      // 如果没有当前歌曲，使用默认值
      savedOffset = 0;
      console.log('无当前歌曲，使用默认歌词偏移设置:', savedOffset);
    }
    
    this.lyricsOffset = savedOffset;
  }

  // 生成歌曲的唯一键值（用于存储单独的设置）
  generateSongKey(song) {
    if (!song) return '';
    
    const title = this.getOriginalTitle(song.title);
    const artist = song.author || song.owner?.name || song.uploader || 'UP主';
    
    // 清理字符串，只保留字母数字和中文
    const cleanTitle = title.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();
    const cleanArtist = artist.replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase();
    
    return `${cleanTitle}_${cleanArtist}`;
  }

  // 初始化托盘事件监听
  initTrayListeners() {
    if (window.electronAPI) {
      if (window.electronAPI.onTrayTogglePlay) {
        window.electronAPI.onTrayTogglePlay(() => {
          this.togglePlay();
        });
      }
      
      if (window.electronAPI.onTrayPlayPrevious) {
        window.electronAPI.onTrayPlayPrevious(() => {
          this.playPrevious();
        });
      }
      
      if (window.electronAPI.onTrayPlayNext) {
        window.electronAPI.onTrayPlayNext(() => {
          this.playNext();
        });
      }
    }
  }
  
  // 更新托盘菜单
  updateTrayMenu() {
    if (window.electronAPI && window.electronAPI.window && window.electronAPI.window.updateTrayMenu) {
      const playerState = {
        isPlaying: this.isPlaying,
        currentSong: this.currentSong ? {
          title: this.getOriginalTitle(this.currentSong.title),
          artist: this.currentSong.owner?.name || this.currentSong.uploader || 'UP主'
        } : null,
        hasPlaylist: this.playlist.length > 1
      };
      window.electronAPI.window.updateTrayMenu(playerState);
    }
  }
}

// 导出
window.Player = Player; 