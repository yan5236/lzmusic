/**
 * 分P选择器组件
 * 提供优雅的分P选择界面，支持自动适配主题和响应式设计
 */
class PageSelector {
  constructor() {
    this.modal = null;
    this.resolve = null;
    this.reject = null;
    this.cssLoaded = false;
    this.init();
  }

  /**
   * 初始化组件
   */
  async init() {
    await this.loadCSS();
    this.createModal();
  }

  /**
   * 动态加载CSS样式文件
   */
  loadCSS() {
    return new Promise((resolve) => {
      if (this.cssLoaded) {
        resolve();
        return;
      }

      // 检查是否已经加载过CSS
      const existingLink = document.querySelector('link[href*="page-selector.css"]');
      if (existingLink) {
        this.cssLoaded = true;
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = './styles/page-selector.css';

      link.onload = () => {
        this.cssLoaded = true;
        resolve();
      };

      link.onerror = () => {
        console.warn('PageSelector CSS文件加载失败，使用内联样式');
        this.addInlineStyles();
        this.cssLoaded = true;
        resolve();
      };

      document.head.appendChild(link);
    });
  }

  /**
   * 创建模态框DOM结构
   */
  createModal() {
    const modalHTML = `
      <div class="page-selector-modal" style="display: none;">
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>选择播放分P</h3>
              <button class="close-btn" aria-label="关闭">&times;</button>
            </div>
            <div class="modal-body">
              <div class="pages-list" role="list"></div>
            </div>
            <div class="modal-footer">
              <button class="cancel-btn">取消</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 确保模态框添加到body末尾，避免被其他元素影响
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.querySelector('.page-selector-modal:last-child');

    // 确保模态框的定位样式
    if (this.modal) {
      this.modal.style.position = 'fixed';
      this.modal.style.zIndex = '99999';
      this.modal.style.top = '0';
      this.modal.style.left = '0';
      this.modal.style.width = '100vw';
      this.modal.style.height = '100vh';
    }

    this.bindEvents();
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const closeBtn = this.modal.querySelector('.close-btn');
    const cancelBtn = this.modal.querySelector('.cancel-btn');
    const overlay = this.modal.querySelector('.modal-overlay');

    // 关闭按钮事件
    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());

    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // 键盘事件处理
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * 键盘事件处理
   * @param {KeyboardEvent} e 键盘事件
   */
  handleKeydown(e) {
    if (!this.modal?.classList.contains('show')) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'Enter':
        e.preventDefault();
        const focusedItem = this.modal.querySelector('.page-item:focus');
        if (focusedItem) {
          focusedItem.click();
        }
        break;
    }
  }

  /**
   * 显示分P选择器
   * @param {Array} pages 分P数据数组
   * @returns {Promise} 返回用户选择的结果
   */
  async show(pages) {
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      throw new Error('分P数据无效');
    }

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;

      try {
        // 渲染分P列表
        this.renderPages(pages);

        // 显示模态框
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // 防止背景滚动

        // 添加动画效果
        requestAnimationFrame(() => {
          this.modal.classList.add('show');
        });

        // 设置焦点到第一个分P项
        setTimeout(() => {
          const firstItem = this.modal.querySelector('.page-item');
          if (firstItem) {
            firstItem.focus();
          }
        }, 100);

      } catch (error) {
        console.error('显示分P选择器时出错:', error);
        reject(error);
      }
    });
  }

  /**
   * 渲染分P列表
   * @param {Array} pages 分P数据数组
   */
  renderPages(pages) {
    const pagesList = this.modal.querySelector('.pages-list');

    try {
      pagesList.innerHTML = pages.map((page, index) => `
        <div class="page-item"
             data-index="${index}"
             data-cid="${this.escapeHtml(page.cid)}"
             tabindex="0"
             role="listitem"
             aria-label="分P ${index + 1}: ${this.escapeHtml(this.formatPageTitle(page.part))}">
          <div class="page-title">P${index + 1}: ${this.escapeHtml(this.formatPageTitle(page.part))}</div>
          <div class="page-info">时长: ${this.formatDuration(page.duration)}</div>
        </div>
      `).join('');

      // 绑定点击事件
      pagesList.addEventListener('click', this.handlePageClick.bind(this, pages));

    } catch (error) {
      console.error('渲染分P列表时出错:', error);
      pagesList.innerHTML = '<div class="error-message">加载分P列表失败</div>';
    }
  }

  /**
   * 处理分P项点击事件
   * @param {Array} pages 分P数据数组
   * @param {Event} e 点击事件
   */
  handlePageClick(pages, e) {
    const pageItem = e.target.closest('.page-item');
    if (!pageItem) return;

    const index = parseInt(pageItem.dataset.index);
    let cid = pageItem.dataset.cid;

    if (isNaN(index) || index < 0 || index >= pages.length) {
      console.error('无效的分P索引:', index);
      return;
    }

    // 确保CID有效
    const page = pages[index];
    if (!cid || cid === 'undefined' || cid === 'null') {
      cid = page.cid;
    }

    // 验证CID
    if (!cid || isNaN(Number(cid)) || Number(cid) <= 0) {
      console.error('无效的CID:', cid, '页面数据:', page);
      return;
    }

    this.selectPage(index, cid, page);
  }

  /**
   * 格式化分P标题
   * @param {string} title 原始标题
   * @returns {string} 格式化后的标题
   */
  formatPageTitle(title) {
    if (!title || typeof title !== 'string') {
      return '未命名分P';
    }
    return title.trim() || '未命名分P';
  }

  /**
   * 格式化时长
   * @param {number} seconds 秒数
   * @returns {string} 格式化后的时长字符串
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * HTML转义，防止XSS攻击
   * @param {string} text 需要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 选择分P
   * @param {number} index 分P索引
   * @param {string} cid 分P的cid
   * @param {Object} page 分P数据对象
   */
  selectPage(index, cid, page) {
    if (this.resolve) {
      this.resolve({
        index,
        cid,
        page,
        timestamp: Date.now()
      });
    }
    this.close();
  }

  /**
   * 关闭模态框
   */
  close() {
    // 移除显示类
    this.modal.classList.remove('show');

    // 恢复背景滚动
    document.body.style.overflow = '';

    // 延迟隐藏模态框
    setTimeout(() => {
      if (this.modal) {
        this.modal.style.display = 'none';
      }
    }, 400);

    // 清理Promise状态
    if (this.reject) {
      this.reject(new Error('用户取消选择'));
    }
    this.cleanup();
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.resolve = null;
    this.reject = null;

    // 移除键盘事件监听器
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.cleanup();
  }
}

// 导出到全局
window.PageSelector = PageSelector; 