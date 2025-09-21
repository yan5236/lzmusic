// 主应用类
class App {
  constructor() {
    this.api = new BilibiliAPI();
    this.settings = new Settings();
    
    // 组件实例
    this.titleBar = new TitleBar();
    this.player = new Player();
    this.sidebar = new Sidebar();
    this.searchComponent = new Search(this.player, this.api);
    this.playlistComponent = new Playlist(this.player);
    this.historyComponent = new History(this.player);
    this.playlistManagement = null;
    
    // 主题管理器
    this.themeManager = new ThemeManager();
    this.themeSettings = new ThemeSettings(this.themeManager);
    
    // 设置全局引用
    window.app = this;
    window.player = this.player; // 添加播放器全局引用
    window.neteaseAPI = neteaseAPI; // 添加网易云API全局引用
    window.themeManager = this.themeManager; // 添加主题管理器全局引用
    
    this.init();
  }

  async init() {
    try {
      // 等待 DOM 加载完成
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // 初始化组件
      this.initComponents();
      
      // 绑定全局事件
      this.bindGlobalEvents();
      
      // 加载推荐内容
      this.loadRecommendations();
      
      console.log('LZ Music 应用已启动');
      
    } catch (error) {
      console.error('应用初始化失败:', error);
      this.showError('应用初始化失败');
    }
  }

  initComponents() {
    // 组件已在构造函数中初始化，这里只进行额外的设置
    
    // 检查播放栏是否可见
    setTimeout(() => {
      const playerBar = document.getElementById('playerBar');
      if (playerBar) {
        console.log('播放栏元素存在:', playerBar);
        console.log('播放栏样式:', window.getComputedStyle(playerBar));
        console.log('播放栏位置:', playerBar.getBoundingClientRect());
      } else {
        console.error('播放栏元素不存在!');
      }
    }, 1000);
  }

  bindGlobalEvents() {
    // 页面切换事件
    document.addEventListener('pageSwitch', (e) => {
      this.onPageSwitch(e.detail.pageId);
    });

    // 绑定刷新推荐按钮
    const refreshBtn = document.getElementById('refreshRecommendationsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshRecommendations());
    }

    // 绑定检查更新按钮
    const checkUpdateBtn = document.getElementById('checkUpdateBtn');
    if (checkUpdateBtn) {
      checkUpdateBtn.addEventListener('click', () => this.checkForUpdates());
    }

    // 绑定版本显示
    this.updateVersionDisplay();

    // 应用错误处理
    window.addEventListener('error', (e) => {
      console.error('全局错误:', e.error);
      this.showError('发生未知错误');
    });

    // 未处理的 Promise 错误
    window.addEventListener('unhandledrejection', (e) => {
      console.error('未处理的 Promise 错误:', e.reason);
      this.showError('请求失败');
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      this.handleGlobalKeydown(e);
    });

    // 窗口关闭前保存状态
    window.addEventListener('beforeunload', () => {
      this.saveAppState();
    });
  }

  // 页面切换处理
  onPageSwitch(pageId) {
    console.log('切换到页面:', pageId);
    
    switch (pageId) {
      case 'home':
        this.loadRecommendations();
        break;
      case 'search':
        // 搜索页面已在 Sidebar 中处理
        break;
      case 'playlist':
        // 歌单页面已在 Sidebar 中处理
        break;
      case 'settings':
        // 设置页面处理
        console.log('设置页面已加载');
        break;
    }
  }

  // 加载推荐内容
  async loadRecommendations() {
    const recommendedMusic = document.getElementById('recommendedMusic');
    if (!recommendedMusic) return;

    try {
      // 显示加载状态
      recommendedMusic.innerHTML = this.createLoadingHTML();

      // 获取推荐内容（不包含历史）
      const recommendations = await this.getMixedRecommendations();
      
      if (recommendations && recommendations.length > 0) {
        this.renderRecommendations(recommendations);
      } else {
        this.renderDefaultRecommendations();
      }

    } catch (error) {
      console.error('加载推荐内容失败:', error);
      recommendedMusic.innerHTML = this.createErrorHTML('加载推荐内容失败');
    }
  }

  // 获取混合推荐内容
  async getMixedRecommendations() {
    const recommendations = [];
    
    try {
      // 1. 优先从B站API获取热门视频推荐 (最多12个)
      try {
        const hotVideos = await this.api.getRecommendedVideos();
        if (hotVideos && hotVideos.length > 0) {
          // 获取详细信息包含cid
          const detailedVideos = await Promise.all(
            hotVideos.slice(0, 12).map(async (video) => {
              try {
                const videoInfo = await this.api.getVideoInfo(video.bvid);
                return {
                  ...video,
                  cid: videoInfo.cid
                };
              } catch (error) {
                console.error(`获取视频 ${video.bvid} 详细信息失败:`, error);
                return video;
              }
            })
          );
          
          recommendations.push(...detailedVideos);
        }
      } catch (error) {
        console.warn('获取B站推荐失败，使用默认推荐');
      }
      
      // 2. 如果推荐数量不够，添加默认推荐内容
      if (recommendations.length < 8) {
        const defaultRecommendations = this.getDefaultRecommendations();
        recommendations.push(...defaultRecommendations.slice(0, 12 - recommendations.length));
      }
      
      // 3. 打乱顺序，增加多样性，并限制为12个
      return this.shuffleArray(recommendations).slice(0, 12);
      
    } catch (error) {
      console.error('获取混合推荐失败:', error);
      return this.getDefaultRecommendations();
    }
  }

  // 获取默认推荐内容
  getDefaultRecommendations() {
    return [
      {
        bvid: 'BV1234567890',
        title: '【纯音乐】放松心情的轻音乐合集',
        author: '音乐分享',
        cover: '',
        duration: '30:00',
        cid: '123456789'
      },
      {
        bvid: 'BV2345678901',
        title: '【流行音乐】2024年度热门歌曲精选',
        author: '音乐推荐',
        cover: '',
        duration: '45:30',
        cid: '234567890'
      },
      {
        bvid: 'BV3456789012',
        title: '【古风音乐】穿越千年的古韵旋律',
        author: '古风音乐馆',
        cover: '',
        duration: '38:20',
        cid: '345678901'
      },
      {
        bvid: 'BV4567890123',
        title: '【摇滚音乐】燃烧激情的摇滚经典',
        author: '摇滚乐迷',
        cover: '',
        duration: '42:15',
        cid: '456789012'
      },
      {
        bvid: 'BV5678901234',
        title: '【民谣音乐】温暖人心的民谣故事',
        author: '民谣时光',
        cover: '',
        duration: '35:45',
        cid: '567890123'
      },
      {
        bvid: 'BV6789012345',
        title: '【电子音乐】未来感十足的电音派对',
        author: '电音世界',
        cover: '',
        duration: '40:30',
        cid: '678901234'
      },
      {
        bvid: 'BV7890123456',
        title: '【爵士音乐】优雅迷人的爵士夜晚',
        author: '爵士咖啡厅',
        cover: '',
        duration: '33:50',
        cid: '789012345'
      },
      {
        bvid: 'BV8901234567',
        title: '【二次元音乐】动漫音乐精选集',
        author: '二次元音乐站',
        cover: '',
        duration: '28:40',
        cid: '890123456'
      },
      {
        bvid: 'BV9012345678',
        title: '【钢琴音乐】古典钢琴名曲赏析',
        author: '钢琴艺术',
        cover: '',
        duration: '44:20',
        cid: '901234567'
      },
      {
        bvid: 'BV0123456789',
        title: '【吉他音乐】指弹吉他的魅力时光',
        author: '吉他手',
        cover: '',
        duration: '32:10',
        cid: '012345678'
      },
      {
        bvid: 'BV1357924680',
        title: '【治愈音乐】疗愈心灵的温柔旋律',
        author: '治愈系音乐',
        cover: '',
        duration: '36:25',
        cid: '135792468'
      },
      {
        bvid: 'BV2468013579',
        title: '【世界音乐】环球音乐文化之旅',
        author: '世界音乐探索',
        cover: '',
        duration: '41:15',
        cid: '246801357'
      }
    ];
  }

  // 打乱数组顺序
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 渲染推荐内容
  renderRecommendations(videos) {
    const recommendedMusic = document.getElementById('recommendedMusic');
    if (!recommendedMusic) return;

    this.renderMusicGrid(videos, recommendedMusic);
  }

  // 通用音乐网格渲染方法
  renderMusicGrid(videos, container) {
    if (!container) return;

    const fragment = document.createDocumentFragment();

    videos.forEach(video => {
      const card = this.createMusicCard(video);
      fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  }

  // 渲染默认推荐
  renderDefaultRecommendations() {
    const recommendedMusic = document.getElementById('recommendedMusic');
    if (!recommendedMusic) return;

    // 显示默认推荐内容而不是空状态
    const defaultRecommendations = this.getDefaultRecommendations();
    const shuffledRecommendations = this.shuffleArray(defaultRecommendations).slice(0, 8);
    
    this.renderRecommendations(shuffledRecommendations);
  }

  // 刷新推荐内容
  async refreshRecommendations() {
    const refreshBtn = document.getElementById('refreshRecommendationsBtn');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="spinning">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        刷新中...
      `;
    }

    try {
      // 重新加载推荐内容
      await this.loadRecommendations();
      
      if (refreshBtn) {
        refreshBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          刷新推荐
        `;
        refreshBtn.disabled = false;
      }
      
      this.showSuccess('推荐内容已刷新');
      
    } catch (error) {
      console.error('刷新推荐失败:', error);
      this.showError('刷新推荐失败');
      
      if (refreshBtn) {
        refreshBtn.innerHTML = `刷新推荐`;
        refreshBtn.disabled = false;
      }
    }
  }

  // 创建音乐卡片
  createMusicCard(video) {
    const card = document.createElement('div');
    card.className = 'music-card';
    
    // 格式化时长显示
    const durationDisplay = this.formatDuration(video.duration);
    
    // 处理封面图片
    const coverHTML = video.cover && video.cover.trim() ? 
      `<img src="${video.cover}" alt="${video.title}" loading="lazy">` : 
      `<div class="cover-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>`;

    card.innerHTML = `
      <div class="music-card-cover">
        ${coverHTML}
        <div class="music-card-play">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <div class="music-card-info">
        <h4 class="music-card-title" title="${video.title}">${video.title}</h4>
        <p class="music-card-artist">${video.author} • ${durationDisplay}</p>
      </div>
    `;

    // 绑定事件
    this.bindMusicCardEvents(card, video);
    
    return card;
  }

  // 格式化时长
  formatDuration(duration) {
    // 如果是字符串格式，直接返回
    if (typeof duration === 'string') {
      return duration;
    }
    
    // 处理无效值
    if (!duration || duration === null || duration === undefined) return '00:00';
    
    // 将duration转换为数字
    const numDuration = Number(duration);
    
    // 检查是否为有效数字
    if (isNaN(numDuration) || numDuration < 0) return '00:00';
    
    const minutes = Math.floor(numDuration / 60);
    const seconds = Math.floor(numDuration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // 绑定音乐卡片事件
  bindMusicCardEvents(card, video) {
    const playBtn = card.querySelector('.music-card-play');

    // 双击播放
    card.addEventListener('dblclick', () => {
      this.playMusicCard(video);
    });

    // 播放按钮
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playMusicCard(video);
    });

    // 右键菜单（可选）
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showMusicCardContextMenu(e, video);
    });
  }

  // 播放音乐卡片
  async playMusicCard(video) {
    try {
      // 如果没有 cid，先获取视频信息
      if (!video.cid) {
        const videoInfo = await this.api.getVideoInfo(video.bvid);
        video.cid = videoInfo.cid;
      }

      await this.player.playSong(video, [video], 0);
    } catch (error) {
      console.error('播放失败:', error);
      this.showError('播放失败：' + error.message);
    }
  }

  // 显示音乐卡片右键菜单
  showMusicCardContextMenu(event, video) {
    // 简化实现，直接触发添加到歌单
    const addEvent = new CustomEvent('addToPlaylist', {
      detail: { video }
    });
    document.dispatchEvent(addEvent);
  }

  // 全局键盘快捷键处理
  handleGlobalKeydown(e) {
    // 如果焦点在输入框，不处理全局快捷键
    if (e.target.matches('input, textarea')) {
      return;
    }

    // Ctrl/Cmd + 数字键切换页面
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'f':
          e.preventDefault();
          this.sidebar.switchPage('search');
          break;
        case 'h':
          e.preventDefault();
          this.sidebar.switchPage('home');
          break;
        case 'l':
          e.preventDefault();
          this.sidebar.switchPage('playlist');
          break;
        case ',':
          e.preventDefault();
          this.sidebar.switchPage('settings');
          break;
      }
    }

    // ESC 键关闭模态框
    if (e.key === 'Escape') {
      if (this.player.isModalOpen) {
        this.player.closeModal();
      }
    }
  }

  // 保存应用状态
  saveAppState() {
    try {
      const state = {
        currentPage: this.sidebar.getCurrentPage(),
        playerState: this.player.getState(),
        timestamp: Date.now()
      };

      localStorage.setItem('lzmusic_appState', JSON.stringify(state));
    } catch (error) {
      console.error('保存应用状态失败:', error);
    }
  }

  // 恢复应用状态
  restoreAppState() {
    try {
      const stateStr = localStorage.getItem('lzmusic_appState');
      if (!stateStr) return;

      const state = JSON.parse(stateStr);
      
      // 检查状态是否过期（1天）
      if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
        return;
      }

      // 恢复页面
      if (state.currentPage) {
        this.sidebar.switchPage(state.currentPage);
      }

      // 恢复播放器状态（如果需要）
      // 这里可以添加恢复当前歌曲信息的逻辑

    } catch (error) {
      console.error('恢复应用状态失败:', error);
    }
  }

  // 创建加载 HTML
  createLoadingHTML() {
    return `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    `;
  }

  // 创建错误 HTML
  createErrorHTML(message) {
    return `
      <div class="error-message">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <p>${message}</p>
        <button onclick="window.app.loadRecommendations()">重试</button>
      </div>
    `;
  }

  // 显示错误消息
  showError(message) {
    // 创建错误提示
    const errorToast = document.createElement('div');
    errorToast.className = 'error-toast';
    errorToast.textContent = message;
    errorToast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      transition: all 0.3s ease;
      transform: translateX(100%);
    `;

    document.body.appendChild(errorToast);
    
    setTimeout(() => {
      errorToast.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
      errorToast.style.transform = 'translateX(100%)';
      setTimeout(() => errorToast.remove(), 300);
    }, 5000);
  }

  // 显示成功消息
  showSuccess(message) {
    // 创建成功提示
    const successToast = document.createElement('div');
    successToast.className = 'success-toast';
    successToast.textContent = message;
    successToast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      transition: all 0.3s ease;
      transform: translateX(100%);
    `;

    document.body.appendChild(successToast);
    
    setTimeout(() => {
      successToast.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
      successToast.style.transform = 'translateX(100%)';
      setTimeout(() => successToast.remove(), 300);
    }, 3000);
  }

  // 获取应用信息
  getAppInfo() {
    return {
      name: 'LZ Music',
      version: '1.0.0',
      description: '基于 Bilibili API 的音乐播放器',
      components: {
        sidebar: !!this.sidebar,
        player: !!this.player,
        search: !!this.searchComponent,
        playlist: !!this.playlistComponent
      }
    };
  }

  // 更新版本显示
  updateVersionDisplay() {
    const appVersionElement = document.getElementById('appVersion');
    if (appVersionElement) {
      appVersionElement.textContent = this.getCurrentVersion();
    }
  }

  // 获取当前版本
  getCurrentVersion() {
    return '1.0.8-bata'; // 从package.json获取
  }

  // 检查更新
  async checkForUpdates() {
    const checkUpdateBtn = document.getElementById('checkUpdateBtn');
    if (!checkUpdateBtn) return;

    // 显示检查中状态
    const originalText = checkUpdateBtn.textContent;
    checkUpdateBtn.disabled = true;
    checkUpdateBtn.textContent = '检查中...';

    try {
      // 从GitHub API获取最新版本信息
      const response = await fetch('https://api.github.com/repos/yan5236/lzmusic/releases/latest', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'LZ-Music-App'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const releaseData = await response.json();
      const latestVersion = releaseData.tag_name.replace(/^v/, ''); // 移除v前缀
      const currentVersion = this.getCurrentVersion();

      // 比较版本
      if (this.compareVersions(latestVersion, currentVersion) > 0) {
        // 有新版本
        this.showUpdateAvailable(releaseData);
      } else {
        // 已是最新版本
        this.showSuccess('当前已是最新版本！');
      }

    } catch (error) {
      console.error('检查更新失败:', error);
      
      let errorMessage = '检查更新失败';
      if (error.message.includes('HTTP 403')) {
        errorMessage = '检查更新失败：API请求限制，请稍后再试';
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = '检查更新失败：未找到版本信息';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '检查更新失败：网络连接错误';
      } else {
        errorMessage = `检查更新失败：${error.message}`;
      }
      
      this.showError(errorMessage);
    } finally {
      // 恢复按钮状态
      checkUpdateBtn.disabled = false;
      checkUpdateBtn.textContent = originalText;
    }
  }

  // 版本比较函数
  compareVersions(version1, version2) {
    // 移除beta、alpha等后缀进行比较
    const v1 = version1.replace(/-.*$/, '').split('.').map(Number);
    const v2 = version2.replace(/-.*$/, '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    
    return 0;
  }

  // 显示更新可用对话框
  showUpdateAvailable(releaseData) {
    const dialog = document.createElement('div');
    dialog.className = 'update-dialog';
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>发现新版本</h3>
          <button class="dialog-close-btn" onclick="this.closest('.update-dialog').remove()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="version-info">
            <p><strong>当前版本：</strong>${this.getCurrentVersion()}</p>
            <p><strong>最新版本：</strong>${releaseData.tag_name}</p>
            <p><strong>发布时间：</strong>${new Date(releaseData.published_at).toLocaleDateString('zh-CN')}</p>
          </div>
          <div class="release-notes">
            <h4>更新内容：</h4>
            <div class="release-content">${this.formatReleaseNotes(releaseData.body)}</div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn secondary-btn" onclick="this.closest('.update-dialog').remove()">
            稍后提醒
          </button>
          <button class="dialog-btn primary-btn" onclick="window.open('${releaseData.html_url}', '_blank')">
            前往下载
          </button>
        </div>
      </div>
    `;

    // 添加样式
    if (!document.getElementById('update-dialog-styles')) {
      const styles = document.createElement('style');
      styles.id = 'update-dialog-styles';
      styles.textContent = `
        .update-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .update-dialog .dialog-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }
        
        .update-dialog .dialog-content {
          position: relative;
          background: var(--bg-color);
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        
        .update-dialog .dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .update-dialog .dialog-header h3 {
          margin: 0;
          color: var(--text-color);
          font-size: 18px;
        }
        
        .update-dialog .dialog-close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .update-dialog .dialog-close-btn:hover {
          background: var(--hover-color);
          color: var(--text-color);
        }
        
        .update-dialog .dialog-body {
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .update-dialog .version-info {
          margin-bottom: 20px;
        }
        
        .update-dialog .version-info p {
          margin: 8px 0;
          color: var(--text-color);
        }
        
        .update-dialog .release-notes h4 {
          margin: 0 0 12px 0;
          color: var(--text-color);
          font-size: 16px;
        }
        
        .update-dialog .release-content {
          background: var(--bg-secondary);
          padding: 12px;
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .update-dialog .dialog-footer {
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid var(--border-color);
          justify-content: flex-end;
        }
        
        .update-dialog .dialog-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .update-dialog .secondary-btn {
          background: var(--bg-secondary);
          color: var(--text-secondary);
        }
        
        .update-dialog .secondary-btn:hover {
          background: var(--hover-color);
          color: var(--text-color);
        }
        
        .update-dialog .primary-btn {
          background: var(--primary-color);
          color: white;
        }
        
        .update-dialog .primary-btn:hover {
          background: var(--primary-hover);
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(dialog);

    // 点击遮罩关闭
    dialog.querySelector('.dialog-overlay').addEventListener('click', () => {
      dialog.remove();
    });
  }

  // 格式化发布说明
  formatReleaseNotes(body) {
    if (!body) return '暂无更新说明';
    
    // 简单的markdown转换
    return body
      .replace(/^### (.*$)/gim, '<h5>$1</h5>')
      .replace(/^## (.*$)/gim, '<h4>$1</h4>')
      .replace(/^# (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gim, '<p>$1</p>')
      .replace(/<p><li>/g, '<ul><li>')
      .replace(/<\/li><\/p>/g, '</li></ul>')
      .replace(/<p><h([1-6])>/g, '<h$1>')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      .replace(/<p><\/p>/g, '');
  }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

// 导出到全局
window.App = App; 