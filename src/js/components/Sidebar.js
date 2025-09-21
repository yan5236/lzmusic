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

    // 歌单管理设置
    this.loadPlaylistManagementSettings();
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

  // 加载歌单管理设置
  loadPlaylistManagementSettings() {
    // 初始化歌单管理器
    if (!this.playlistManager) {
      this.playlistManager = new PlaylistManager();
    }

    // 绑定导出歌单事件
    const exportBtn = document.getElementById('exportPlaylistBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.showExportPlaylistDialog());
    }

    // 绑定导入歌单事件
    const importBtn = document.getElementById('importPlaylistBtn');
    const importFile = document.getElementById('importPlaylistFile');

    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => {
        importFile.click();
      });

      importFile.addEventListener('change', (e) => this.handleImportPlaylist(e));
    }
  }

  // 显示导出歌单对话框
  showExportPlaylistDialog() {
    const playlists = this.playlistManager.getAll();

    if (playlists.length === 0) {
      this.showToast('暂无歌单可导出');
      return;
    }

    // 创建歌单列表HTML
    const playlistItems = playlists.map(playlist => `
      <div class="export-playlist-item" data-id="${playlist.id}">
        <div class="playlist-checkbox">
          <input type="checkbox" id="playlist-${playlist.id}">
          <label for="playlist-${playlist.id}"></label>
        </div>
        <div class="playlist-info">
          <div class="playlist-name">${playlist.name}</div>
          <div class="playlist-count">${playlist.songs.length} 首歌曲</div>
        </div>
      </div>
    `).join('');

    // 创建对话框
    const dialogElement = this.createExportDialog(`
      <div class="export-playlist-dialog">
        <div class="export-dialog-header">
          <h3>选择要导出的歌单</h3>
          <div class="export-actions">
            <button class="select-all-btn" id="selectAllPlaylists">全选</button>
            <button class="select-none-btn" id="selectNonePlaylists">取消全选</button>
          </div>
        </div>
        <div class="export-playlist-list">
          ${playlistItems}
        </div>
        <div class="export-dialog-footer">
          <div class="selected-info">
            已选择 <span id="selectedPlaylistCount">0</span> 个歌单
          </div>
        </div>
      </div>
    `);

    // 绑定事件
    this.bindExportDialogEvents(dialogElement);
  }

  // 绑定导出对话框事件
  bindExportDialogEvents(dialog) {
    const selectAllBtn = dialog.querySelector('#selectAllPlaylists');
    const selectNoneBtn = dialog.querySelector('#selectNonePlaylists');
    const checkboxes = dialog.querySelectorAll('.playlist-checkbox input[type="checkbox"]');
    const selectedCount = dialog.querySelector('#selectedPlaylistCount');

    // 更新选中计数
    const updateSelectedCount = () => {
      const checked = dialog.querySelectorAll('.playlist-checkbox input[type="checkbox"]:checked');
      selectedCount.textContent = checked.length;

      // 更新导出按钮状态
      const exportBtn = dialog.querySelector('.dialog-btn-primary');
      if (exportBtn) {
        exportBtn.disabled = checked.length === 0;
        exportBtn.textContent = checked.length === 0 ? '请选择歌单' : `导出 ${checked.length} 个歌单`;
      }
    };

    // 全选
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = true);
      updateSelectedCount();
    });

    // 取消全选
    selectNoneBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = false);
      updateSelectedCount();
    });

    // 监听单个复选框变化
    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateSelectedCount);
    });

    // 初始化计数
    updateSelectedCount();
  }

  // 处理导出歌单
  async handleExportSelectedPlaylists(dialog) {
    const checkedBoxes = dialog.querySelectorAll('.playlist-checkbox input[type="checkbox"]:checked');

    if (checkedBoxes.length === 0) {
      this.showToast('请选择要导出的歌单');
      return;
    }

    try {
      const selectedIds = Array.from(checkedBoxes).map(cb => cb.id.replace('playlist-', ''));
      let exportData;
      let filename;

      if (selectedIds.length === 1) {
        // 导出单个歌单
        exportData = this.playlistManager.exportPlaylist(selectedIds[0]);
        const playlist = this.playlistManager.get(selectedIds[0]);
        filename = `LZMusic_${playlist.name}_${this.formatDate(new Date())}.json`;
      } else {
        // 导出多个歌单
        const selectedPlaylists = selectedIds.map(id => this.playlistManager.get(id)).filter(Boolean);
        exportData = {
          type: 'playlists',
          exportTime: Date.now(),
          count: selectedPlaylists.length,
          playlists: selectedPlaylists.map(playlist => ({
            name: playlist.name,
            createTime: playlist.createTime,
            updateTime: playlist.updateTime,
            songs: playlist.songs.map(song => ({
              title: song.title,
              author: song.author,
              bvid: song.bvid,
              duration: song.duration,
              cover: song.cover,
              cid: song.cid,
              pages: song.pages,
              play: song.play
            }))
          }))
        };
        filename = `LZMusic_选中歌单_${this.formatDate(new Date())}.json`;
      }

      if (!exportData) {
        this.showToast('导出失败，请重试');
        return;
      }

      // 下载文件并打开文件夹
      await this.downloadJsonAndOpenFolder(exportData, filename);

      this.showToast(`成功导出 ${selectedIds.length} 个歌单`);
      // 关闭对话框
      dialog.classList.remove('show');
      setTimeout(() => dialog.remove(), 300);

    } catch (error) {
      console.error('导出歌单失败:', error);
      this.showToast('导出失败: ' + error.message);
    }
  }

  // 处理导入歌单
  async handleImportPlaylist(event) {
    const file = event.target.files[0];
    if (!file) return;

    const importStatus = document.getElementById('importFileStatus');

    try {
      // 确保状态元素存在，如果不存在则显示Toast提示
      if (importStatus) {
        importStatus.textContent = '正在导入...';
        importStatus.className = 'import-status importing';
      }

      // 显示导入开始的提示
      this.showToast('开始导入歌单...', 'info');

      const fileContent = await this.readFile(file);
      const importResult = this.playlistManager.importPlaylist(fileContent);

      if (importResult.success > 0) {
        // 更新状态显示
        if (importStatus) {
          importStatus.textContent = `导入完成: 成功${importResult.success}个，失败${importResult.failed}个，跳过${importResult.skipped}个`;
          importStatus.className = 'import-status success';
        }

        // 通知歌单组件刷新
        if (window.app && window.app.playlist) {
          window.app.playlist.loadPlaylists();
        }

        // 通知歌单列表页面刷新
        if (window.app && window.app.playlistComponent) {
          window.app.playlistComponent.loadPlaylists();
        }

        // 显示成功提示
        this.showToast(`成功导入 ${importResult.success} 个歌单`, 'success');

        // 显示详细结果
        this.showImportResultDialog(importResult);
      } else {
        // 更新状态显示
        if (importStatus) {
          importStatus.textContent = '导入失败';
          importStatus.className = 'import-status error';
        }

        // 显示失败提示
        const errorMsg = importResult.messages && importResult.messages.length > 0
          ? importResult.messages[0]
          : '导入失败，请检查文件格式';
        this.showToast(errorMsg, 'error');
      }

    } catch (error) {
      console.error('导入歌单失败:', error);

      // 更新状态显示
      if (importStatus) {
        importStatus.textContent = '导入失败';
        importStatus.className = 'import-status error';
      }

      // 显示详细的错误信息
      let errorMessage = '导入失败';
      if (error.message) {
        if (error.message.includes('JSON')) {
          errorMessage = '文件格式错误，请选择正确的JSON格式歌单文件';
        } else if (error.message.includes('读取')) {
          errorMessage = '文件读取失败，请重新选择文件';
        } else {
          errorMessage = `导入失败: ${error.message}`;
        }
      }

      this.showToast(errorMessage, 'error');
    } finally {
      // 清空文件选择（延迟清空，避免用户困惑）
      setTimeout(() => {
        event.target.value = '';
      }, 1000);

      // 5秒后清除状态显示（延长时间让用户看到结果）
      setTimeout(() => {
        if (importStatus) {
          importStatus.textContent = '';
          importStatus.className = 'import-status';
        }
      }, 5000);
    }
  }

  // 显示导入结果对话框
  showImportResultDialog(result) {
    const messages = result.messages.slice(0, 10); // 最多显示10条消息
    const hasMore = result.messages.length > 10;

    const messagesList = messages.map(msg => `<li>${msg}</li>`).join('');
    const moreText = hasMore ? `<li>... 还有 ${result.messages.length - 10} 条消息</li>` : '';

    if (window.CustomDialog) {
      const dialog = new CustomDialog({
        title: '导入结果',
        content: `
          <div class="import-result-dialog">
            <div class="result-summary">
              <p><strong>导入完成</strong></p>
              <p>成功: ${result.success} 个 | 失败: ${result.failed} 个 | 跳过: ${result.skipped} 个</p>
            </div>
            <div class="result-details">
              <h4>详细信息:</h4>
              <ul class="result-messages">
                ${messagesList}
                ${moreText}
              </ul>
            </div>
          </div>
        `,
        confirmText: '确定',
        showCancel: false
      });
      dialog.show();
    }
  }

  // 读取文件内容
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  // 创建导出对话框
  createExportDialog(content) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';

    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="dialog-title">导出歌单</div>
        </div>
        <div class="dialog-body">
          ${content}
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-secondary">取消</button>
          <button class="dialog-btn dialog-btn-primary" disabled>请选择歌单</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 绑定按钮事件
    const cancelBtn = dialog.querySelector('.dialog-btn-secondary');
    const exportBtn = dialog.querySelector('.dialog-btn-primary');

    const closeDialog = () => {
      dialog.classList.remove('show');
      setTimeout(() => dialog.remove(), 300);
    };

    cancelBtn.addEventListener('click', closeDialog);
    exportBtn.addEventListener('click', () => this.handleExportSelectedPlaylists(dialog));

    // 显示对话框
    setTimeout(() => dialog.classList.add('show'), 10);

    // 返回DOM元素本身，而不是包装对象
    return dialog;
  }

  // 下载JSON文件并打开文件夹
  async downloadJsonAndOpenFolder(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    // 尝试打开下载文件夹
    try {
      if (window.electronAPI && window.electronAPI.showItemInFolder) {
        // 如果是Electron环境，使用Electron API打开文件夹
        // 这里需要获取下载路径，暂时使用默认下载路径
        await window.electronAPI.showDownloadsFolder();
      } else {
        // 浏览器环境的话，显示提示
        this.showToast('文件已下载到默认下载文件夹', 'success');
      }
    } catch (error) {
      console.log('无法自动打开文件夹:', error);
      this.showToast('文件已下载完成', 'success');
    }
  }

  // 下载JSON文件（保留原方法用于导入等其他功能）
  downloadJson(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
  }

  // 显示提示消息
  showToast(message, type = 'info') {
    // 复用现有的toast实现或创建新的
    if (window.app && window.app.showToast) {
      window.app.showToast(message, type);
    } else {
      // 简单的toast实现
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      `;

      document.body.appendChild(toast);

      // 显示动画
      setTimeout(() => {
        toast.style.transform = 'translateX(0)';
      }, 10);

      // 隐藏动画
      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 3000);
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