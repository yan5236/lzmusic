// 历史记录页面组件
class History {
  constructor(player) {
    this.player = player;
    this.historyDB = new HistoryDB();
    this.currentFilter = 'all';
    this.currentSearchKeyword = '';
    this.currentHistory = [];
    
    this.init();
  }

  async init() {
    try {
      await this.historyDB.init();
      this.bindEvents();
      this.setupIntersectionObserver();
    } catch (error) {
      console.error('历史记录组件初始化失败:', error);
    }
  }

  bindEvents() {
    // 清空历史按钮
    const clearAllBtn = document.getElementById('clearAllHistoryBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAllHistory());
    }

    // 时间筛选
    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
      historyFilter.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.loadHistory();
      });
    }

    // 搜索功能
    const historySearchInput = document.getElementById('historySearchInput');
    if (historySearchInput) {
      let searchTimeout;
      historySearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.currentSearchKeyword = e.target.value;
          this.loadHistory();
        }, 300);
      });
    }

    // 监听页面切换事件
    document.addEventListener('pageSwitch', (e) => {
      if (e.detail.pageId === 'history') {
        this.loadHistory();
      }
    });
  }

  // 设置交集观察器用于懒加载
  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            this.observer.unobserve(img);
          }
        }
      });
    });
  }

  // 加载历史记录
  async loadHistory() {
    const historyList = document.getElementById('historyList');
    const historyCount = document.getElementById('historyCount');
    
    if (!historyList || !historyCount) return;

    try {
      // 显示加载状态
      historyList.innerHTML = this.createLoadingHTML();

      let history = [];
      
      if (this.currentSearchKeyword) {
        // 搜索模式
        history = await this.historyDB.search(this.currentSearchKeyword);
      } else if (this.currentFilter === 'all') {
        // 全部记录
        history = await this.historyDB.getAll();
      } else {
        // 按时间筛选
        history = await this.historyDB.getByTimeRange(this.currentFilter);
      }

      this.currentHistory = history;
      historyCount.textContent = history.length;

      if (history.length === 0) {
        historyList.innerHTML = this.createEmptyHTML();
      } else {
        this.renderHistory(history);
      }

    } catch (error) {
      console.error('加载历史记录失败:', error);
      historyList.innerHTML = this.createErrorHTML('加载历史记录失败');
    }
  }

  // 渲染历史记录
  renderHistory(history) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    const historyHTML = history.map((item, index) => this.createHistoryItemHTML(item, index)).join('');
    historyList.innerHTML = historyHTML;

    // 绑定事件
    this.bindHistoryItemEvents();
  }

  // 创建历史记录项HTML
  createHistoryItemHTML(item, index) {
    const playTime = new Date(item.play_time);
    const timeStr = this.formatTime(playTime);
    const duration = this.formatDuration(item.duration);

    return `
      <div class="history-item" data-bvid="${item.bvid}" data-index="${index}">
        <div class="history-item-cover">
          <img data-src="${item.cover}" alt="${item.title}" loading="lazy">
          <div class="play-overlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <div class="duration">${duration}</div>
        </div>
        <div class="history-item-info">
          <div class="history-item-title" title="${item.title}">${item.title}</div>
          <div class="history-item-author">${item.author}</div>
          <div class="history-item-time">${timeStr}</div>
        </div>
        <div class="history-item-actions">
          <button class="action-btn play-btn" title="播放">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <button class="action-btn remove-btn" title="从历史中移除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // 绑定历史记录项事件
  bindHistoryItemEvents() {
    const historyItems = document.querySelectorAll('.history-item');
    
    historyItems.forEach((item, index) => {
      const playBtn = item.querySelector('.play-btn');
      const removeBtn = item.querySelector('.remove-btn');
      const coverArea = item.querySelector('.history-item-cover');
      const titleArea = item.querySelector('.history-item-title');

      // 懒加载图片
      const img = item.querySelector('img[data-src]');
      if (img) {
        this.observer.observe(img);
      }

      // 播放按钮点击
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.playHistoryItem(index);
        });
      }

      // 移除按钮点击
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeHistoryItem(index);
        });
      }

      // 封面和标题点击播放
      [coverArea, titleArea].forEach(element => {
        if (element) {
          element.addEventListener('click', () => {
            this.playHistoryItem(index);
          });
        }
      });
    });
  }

  // 播放历史记录项
  async playHistoryItem(index) {
    if (index < 0 || index >= this.currentHistory.length) return;

    const item = this.currentHistory[index];
    try {
      // 构造播放项
      const playItem = {
        bvid: item.bvid,
        title: item.title,
        author: item.author,
        cover: item.cover,
        duration: item.duration,
        cid: item.cid,
        // 添加owner属性以兼容Player.playSong方法
        owner: {
          name: item.author
        },
        // 添加pic属性作为cover的别名
        pic: item.cover
      };

      // 使用playSong方法而不是playVideo方法
      await this.player.playSong(playItem, [playItem], 0);
    } catch (error) {
      console.error('播放历史记录项失败:', error);
      this.showMessage('播放失败', 'error');
    }
  }

  // 移除历史记录项
  async removeHistoryItem(index) {
    if (index < 0 || index >= this.currentHistory.length) return;

    const item = this.currentHistory[index];
    
    const confirmed = await this.showConfirmDialog(
      '确认删除',
      `确定要从历史记录中移除《${item.title}》吗？`,
      '删除',
      '取消'
    );
    
    if (confirmed) {
      try {
        const success = await this.historyDB.remove(item.bvid);
        if (success) {
          this.showMessage('已从历史记录中移除');
          // 重新加载历史记录
          this.loadHistory();
        } else {
          this.showMessage('移除失败', 'error');
        }
      } catch (error) {
        console.error('移除历史记录项失败:', error);
        this.showMessage('移除失败', 'error');
      }
    }
  }

  // 清空所有历史记录
  async clearAllHistory() {
    const confirmed = await this.showConfirmDialog(
      '确认清空',
      '确定要清空所有播放历史吗？此操作无法撤销。',
      '清空',
      '取消'
    );
    
    if (confirmed) {
      try {
        const success = await this.historyDB.clear();
        if (success) {
          this.showMessage('历史记录已清空');
          this.loadHistory();
        } else {
          this.showMessage('清空失败', 'error');
        }
      } catch (error) {
        console.error('清空历史记录失败:', error);
        this.showMessage('清空失败', 'error');
      }
    }
  }

  // 格式化时间
  formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  // 格式化时长
  formatDuration(duration) {
    // 处理无效的duration值
    if (!duration || duration === null || duration === undefined) return '00:00';
    
    // 将duration转换为数字
    const numDuration = Number(duration);
    
    // 检查是否为有效数字
    if (isNaN(numDuration) || numDuration < 0) return '00:00';
    
    const minutes = Math.floor(numDuration / 60);
    const seconds = Math.floor(numDuration % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // 创建加载HTML
  createLoadingHTML() {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>加载历史记录中...</p>
      </div>
    `;
  }

  // 创建空状态HTML
  createEmptyHTML() {
    return `
      <div class="empty-container">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" class="empty-icon">
          <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
        </svg>
        <h3>暂无播放历史</h3>
        <p>开始播放音乐，这里会显示您的播放记录</p>
      </div>
    `;
  }

  // 创建错误HTML
  createErrorHTML(message) {
    return `
      <div class="error-container">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" class="error-icon">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <h3>加载失败</h3>
        <p>${message}</p>
        <button class="retry-btn" onclick="window.app.historyComponent.loadHistory()">重试</button>
      </div>
    `;
  }

  // 显示消息
  showMessage(message, type = 'success') {
    // 这里可以实现消息提示功能
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  // 自定义确认对话框
  showConfirmDialog(title, message, confirmText = '确认', cancelText = '取消') {
    return new Promise((resolve) => {
      // 创建对话框HTML
      const dialogHTML = `
        <div class="confirm-dialog-overlay" id="confirmDialogOverlay">
          <div class="confirm-dialog">
            <div class="confirm-dialog-header">
              <h3>${title}</h3>
            </div>
            <div class="confirm-dialog-body">
              <p>${message}</p>
            </div>
            <div class="confirm-dialog-footer">
              <button class="btn btn-secondary" id="confirmDialogCancel">${cancelText}</button>
              <button class="btn btn-danger" id="confirmDialogConfirm">${confirmText}</button>
            </div>
          </div>
        </div>
      `;
      
      // 添加到页面
      document.body.insertAdjacentHTML('beforeend', dialogHTML);
      
      const overlay = document.getElementById('confirmDialogOverlay');
      const confirmBtn = document.getElementById('confirmDialogConfirm');
      const cancelBtn = document.getElementById('confirmDialogCancel');
      
      // 显示对话框
      setTimeout(() => {
        overlay.classList.add('show');
      }, 10);
      
      // 清理函数
      const cleanup = () => {
        overlay.classList.remove('show');
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 300);
      };
      
      // 确认按钮事件
      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
      
      // 取消按钮事件
      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      
      // 点击背景关闭
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
      
      // ESC键关闭
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', handleKeydown);
          cleanup();
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleKeydown);
    });
  }
}

// 导出给全局使用
window.History = History; 