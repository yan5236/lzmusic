// 侧边栏组件
class Sidebar {
  constructor() {
    this.sidebar = document.getElementById('sidebar');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.mainContent = document.getElementById('mainContent');
    this.navItems = document.querySelectorAll('.nav-item');
    this.pages = document.querySelectorAll('.page');
    this.settings = new Settings();
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSettings();
    this.setActiveTooltips();
  }

  bindEvents() {
    // 切换侧边栏
    this.sidebarToggle.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // 导航项点击
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const page = item.dataset.page;
        this.switchPage(page);
      });
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            this.switchPage('home');
            break;
          case '2':
            e.preventDefault();
            this.switchPage('search');
            break;
          case '3':
            e.preventDefault();
            this.switchPage('playlist');
            break;
          case '4':
            e.preventDefault();
            this.switchPage('settings');
            break;
          case 'b':
            e.preventDefault();
            this.toggleSidebar();
            break;
        }
      }
    });

    // 响应式设计
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  // 切换侧边栏
  toggleSidebar() {
    const isCollapsed = this.sidebar.classList.contains('collapsed');
    
    if (isCollapsed) {
      this.expandSidebar();
    } else {
      this.collapseSidebar();
    }
    
    // 保存状态
    this.settings.set('sidebarCollapsed', !isCollapsed);
  }

  // 展开侧边栏
  expandSidebar() {
    this.sidebar.classList.remove('collapsed');
    this.mainContent.classList.remove('sidebar-collapsed');
  }

  // 折叠侧边栏
  collapseSidebar() {
    this.sidebar.classList.add('collapsed');
    this.mainContent.classList.add('sidebar-collapsed');
  }

  // 切换页面
  switchPage(pageId) {
    console.log('切换页面请求:', pageId);
    
    // 移除所有活跃状态
    this.navItems.forEach(item => {
      item.classList.remove('active');
    });
    
    this.pages.forEach(page => {
      page.classList.remove('active');
    });

    // 设置新的活跃状态
    const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
    const activePage = document.getElementById(`${pageId}Page`);

    console.log('页面切换元素检查:', {
      activeNavItem: !!activeNavItem,
      activePage: !!activePage,
      pageId: pageId,
      expectedPageId: `${pageId}Page`
    });

    if (activeNavItem && activePage) {
      activeNavItem.classList.add('active');
      activePage.classList.add('active');
      
      console.log('页面切换成功:', {
        navItemActive: activeNavItem.classList.contains('active'),
        pageActive: activePage.classList.contains('active'),
        pageDisplay: getComputedStyle(activePage).display
      });
      
      // 触发页面切换事件
      this.onPageSwitch(pageId);
    } else {
      console.error('页面切换失败:', {
        pageId,
        activeNavItem: !!activeNavItem,
        activePage: !!activePage
      });
    }
  }

  // 页面切换事件
  onPageSwitch(pageId) {
    const event = new CustomEvent('pageSwitch', {
      detail: { pageId }
    });
    document.dispatchEvent(event);

    // 根据页面类型执行特定操作
    switch (pageId) {
      case 'home':
        this.loadHomePage();
        break;
      case 'search':
        this.focusSearchInput();
        break;
      case 'history':
        this.loadHistoryPage();
        break;
      case 'playlist':
        this.loadPlaylistPage();
        break;
      case 'playlistDetail':
        // 歌单详情页面，由Playlist组件处理
        break;
      case 'settings':
        this.loadSettingsPage();
        break;
    }
  }

  // 加载首页
  loadHomePage() {
    // 加载推荐内容
    if (window.app && window.app.loadRecommendations) {
      window.app.loadRecommendations();
    }
  }

  // 聚焦搜索框
  focusSearchInput() {
    setTimeout(() => {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  // 加载歌单页面
  loadPlaylistPage() {
    if (window.app && window.app.playlistComponent) {
      window.app.playlistComponent.loadPlaylists();
    }
  }

  // 加载历史记录页面
  loadHistoryPage() {
    if (window.app && window.app.historyComponent) {
      window.app.historyComponent.loadHistory();
    }
  }

  // 加载设置页面
  loadSettingsPage() {
    this.loadSettingsUI();
  }

  // 加载设置界面
  loadSettingsUI() {
    const settings = this.settings.get();
    
    // 自动播放设置
    const autoPlayCheckbox = document.getElementById('autoPlay');
    if (autoPlayCheckbox) {
      autoPlayCheckbox.checked = settings.autoPlay;
      autoPlayCheckbox.addEventListener('change', (e) => {
        this.settings.set('autoPlay', e.target.checked);
      });
    }

    // 音质设置
    const qualitySelect = document.getElementById('quality');
    if (qualitySelect) {
      qualitySelect.value = settings.quality;
      qualitySelect.addEventListener('change', (e) => {
        this.settings.set('quality', e.target.value);
      });
    }
    
    // 关闭行为设置
    const closeActionSelect = document.getElementById('closeAction');
    if (closeActionSelect) {
      closeActionSelect.value = settings.closeAction || 'ask';
      closeActionSelect.addEventListener('change', (e) => {
        this.settings.set('closeAction', e.target.value);
        // 如果选择了其他选项，重置"不再询问"状态
        if (e.target.value !== 'ask') {
          this.settings.set('dontAskAgain', false);
        }
      });
    }
    
    // 网易云API设置
    this.loadNeteaseApiSettings(settings);
  }
  
  // 加载网易云API设置
  loadNeteaseApiSettings(settings) {
    const neteaseApiSettings = settings.neteaseApi || {};
    
    // 启用网易云API
    const enabledCheckbox = document.getElementById('neteaseApiEnabled');
    if (enabledCheckbox) {
      enabledCheckbox.checked = neteaseApiSettings.enabled !== false;
      enabledCheckbox.addEventListener('change', (e) => {
        const currentSettings = this.settings.get('neteaseApi', {});
        currentSettings.enabled = e.target.checked;
        this.settings.set('neteaseApi', currentSettings);
        
        // 通知网易云API模块更新配置
        if (window.neteaseAPI) {
          window.neteaseAPI.updateConfig();
        }
      });
    }
  }
  
  // 设置工具提示
  setActiveTooltips() {
    this.navItems.forEach(item => {
      const span = item.querySelector('span');
      if (span) {
        item.setAttribute('data-tooltip', span.textContent);
      }
    });
  }

  // 加载设置
  loadSettings() {
    const sidebarCollapsed = this.settings.get('sidebarCollapsed', false);
    
    if (sidebarCollapsed) {
      this.collapseSidebar();
    }
  }

  // 处理窗口大小变化
  handleResize() {
    const width = window.innerWidth;
    
    // 小屏幕自动折叠侧边栏
    if (width <= 768) {
      this.collapseSidebar();
    } else {
      // 大屏幕恢复设置
      const sidebarCollapsed = this.settings.get('sidebarCollapsed', false);
      if (!sidebarCollapsed) {
        this.expandSidebar();
      }
    }
  }

  // 获取当前活跃页面
  getCurrentPage() {
    const activePage = document.querySelector('.page.active');
    return activePage ? activePage.id.replace('Page', '') : 'home';
  }

  // 高亮导航项
  highlightNavItem(pageId) {
    this.navItems.forEach(item => {
      item.classList.remove('active');
    });
    
    const targetItem = document.querySelector(`[data-page="${pageId}"]`);
    if (targetItem) {
      targetItem.classList.add('active');
    }
  }
}

// 导出
window.Sidebar = Sidebar; 