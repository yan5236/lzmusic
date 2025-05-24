// 播放器组件
class Player {
  constructor() {
    this.audio = document.getElementById('audioPlayer');
    this.api = new BilibiliAPI();
    this.settings = new Settings();
    this.playHistory = new PlayHistory();
    
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
    this.modeBtn = document.getElementById('modeBtn');
    this.expandBtn = document.getElementById('expandBtn');
    
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
    this.volume = this.settings.get('volume', 100);
    this.playMode = this.settings.get('playMode', 'sequence');
    this.isModalOpen = false;
    this.isPanelOpen = false;
    this.isListenPlaylist = false; // 标记是否为试听歌单
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSettings();
    this.setupAudio();
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

  // 播放歌曲
  async playSong(song, playlist = [], index = 0) {
    try {
      this.currentSong = song;
      this.playlist = playlist;
      this.currentIndex = index;
      
      // 更新 UI
      this.updateSongInfo();
      this.showLoading();
      
      // 获取音频流
      const audioData = await this.api.getAudioUrl(song.bvid, song.cid);
      
      // 尝试加载音频
      await this.tryLoadAudioUrls(audioData.all_urls || [audioData.url]);
      
      // 记录播放历史
      this.playHistory.add(song);
      
    } catch (error) {
      console.error('播放失败:', error);
      this.showError('播放失败：' + error.message);
    }
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
  }

  // 上一首
  playPrevious() {
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
    this.playSong(this.playlist[newIndex], this.playlist, newIndex);
    
    // 更新播放列表面板
    if (this.isPanelOpen) {
      this.updatePlaylistPanel();
    }
  }

  // 下一首
  playNext() {
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
    this.playSong(this.playlist[newIndex], this.playlist, newIndex);
    
    // 更新播放列表面板
    if (this.isPanelOpen) {
      this.updatePlaylistPanel();
    }
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

  // 打开播放模态框
  openModal() {
    if (!this.currentSong) {
      this.showError('请先播放一首歌曲');
      return;
    }
    
    this.isModalOpen = true;
    this.updateModalInfo();
    this.playerModal.classList.add('show');
    this.expandBtn.classList.add('active');
  }

  // 关闭播放模态框
  closeModal() {
    this.isModalOpen = false;
    this.playerModal.classList.remove('show');
    this.expandBtn.classList.remove('active');
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
  }

  onEnded() {
    if (this.playMode === 'repeat') {
      this.audio.currentTime = 0;
      this.play();
    } else if (this.settings.get('autoPlay', true)) {
      this.playNext();
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
  }

  updateModalInfo() {
    if (!this.currentSong) return;
    
    this.modalSongTitle.textContent = this.currentSong.title;
    this.modalSongArtist.textContent = this.currentSong.author;
    this.modalCoverImage.src = this.currentSong.cover;
    this.modalCoverImage.onload = () => {
      this.modalCoverImage.classList.add('loaded');
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

    const fragment = document.createDocumentFragment();
    
    this.playlist.forEach((song, index) => {
      const item = this.createPlaylistItem(song, index);
      fragment.appendChild(item);
    });

    this.playlistPanelContent.innerHTML = '';
    this.playlistPanelContent.appendChild(fragment);
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
    
    // 检查歌曲是否已存在
    const existsIndex = this.playlist.findIndex(item => item.bvid === song.bvid);
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
}

// 导出
window.Player = Player; 