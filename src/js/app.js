// 主应用类
class App {
  constructor() {
    this.api = new BilibiliAPI();
    this.settings = new Settings();
    this.playHistory = new PlayHistory();
    
    // 组件实例
    this.titleBar = new TitleBar();
    this.player = new Player();
    this.sidebar = new Sidebar();
    this.searchComponent = new Search(this.player, this.api);
    this.playlistComponent = new Playlist(this.player);
    this.playlistManagement = null;
    
    // 设置全局引用
    window.app = this;
    window.neteaseAPI = neteaseAPI; // 添加网易云API全局引用
    
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
        this.loadRecentHistory();
        break;
      case 'search':
        // 搜索页面已在 Sidebar 中处理
        break;
      case 'playlist':
        // 歌单页面已在 Sidebar 中处理
        break;
      case 'settings':
        // 设置页面已在 Sidebar 中处理
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

  // 加载最近播放历史
  loadRecentHistory() {
    const recentSection = document.getElementById('recentSection');
    const recentMusic = document.getElementById('recentMusic');
    
    if (!recentSection || !recentMusic) return;

    const history = this.playHistory.getAll();
    
    if (history.length > 0) {
      // 显示最近播放区域
      recentSection.style.display = 'block';
      
      // 渲染最近播放的音乐，最多显示6个
      const recentVideos = history.slice(0, 6);
      this.renderMusicGrid(recentVideos, recentMusic);
      
      // 绑定清空历史按钮事件
      const clearHistoryBtn = document.getElementById('clearHistoryBtn');
      if (clearHistoryBtn) {
        clearHistoryBtn.onclick = () => this.clearPlayHistory();
      }
    } else {
      // 隐藏最近播放区域
      recentSection.style.display = 'none';
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
          
          // 过滤掉已播放过的视频，避免历史重复
          const history = this.playHistory.getAll();
          const playedBvids = new Set(history.map(h => h.bvid));
          const filteredVideos = detailedVideos.filter(video => !playedBvids.has(video.bvid));
          
          recommendations.push(...filteredVideos);
        }
      } catch (error) {
        console.warn('获取B站推荐失败，使用默认推荐');
      }
      
      // 2. 如果推荐数量不够，添加默认推荐内容（但不包含历史）
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

  // 清空播放历史
  clearPlayHistory() {
    if (confirm('确定要清空播放历史吗？此操作无法撤销。')) {
      this.playHistory.clear();
      this.loadRecentHistory();
      this.showSuccess('播放历史已清空');
    }
  }

  // 创建音乐卡片
  createMusicCard(video) {
    const card = document.createElement('div');
    card.className = 'music-card';
    
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
        <p class="music-card-artist">${video.author} • ${video.duration}</p>
      </div>
    `;

    // 绑定事件
    this.bindMusicCardEvents(card, video);
    
    return card;
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
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

// 导出到全局
window.App = App; 