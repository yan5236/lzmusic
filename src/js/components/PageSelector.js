class PageSelector {
  constructor() {
    this.modal = null;
    this.resolve = null;
    this.reject = null;
    this.createModal();
  }

  createModal() {
    // 创建模态框HTML
    const modalHTML = `
      <div class="page-selector-modal" style="display: none;">
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>选择播放分P</h3>
              <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <div class="pages-list"></div>
            </div>
            <div class="modal-footer">
              <button class="cancel-btn">取消</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
      .page-selector-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
      }

      .page-selector-modal .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .page-selector-modal .modal-content {
        background: #fff;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 70vh;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }

      .page-selector-modal .modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .page-selector-modal .modal-header h3 {
        margin: 0;
        color: #333;
        font-size: 18px;
      }

      .page-selector-modal .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .page-selector-modal .close-btn:hover {
        color: #666;
      }

      .page-selector-modal .modal-body {
        padding: 20px;
        max-height: 50vh;
        overflow-y: auto;
      }

      .page-selector-modal .pages-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .page-selector-modal .page-item {
        padding: 12px 16px;
        border: 1px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        background: #fff;
      }

      .page-selector-modal .page-item:hover {
        background: #f5f5f5;
        border-color: #007AFF;
      }

      .page-selector-modal .page-item .page-title {
        font-weight: 500;
        color: #333;
        margin-bottom: 4px;
      }

      .page-selector-modal .page-item .page-info {
        font-size: 12px;
        color: #666;
      }

      .page-selector-modal .modal-footer {
        padding: 20px;
        border-top: 1px solid #eee;
        text-align: right;
      }

      .page-selector-modal .cancel-btn {
        padding: 8px 20px;
        background: #f0f0f0;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        color: #666;
      }

      .page-selector-modal .cancel-btn:hover {
        background: #e0e0e0;
      }
    `;

    // 添加到页面
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.querySelector('.page-selector-modal');

    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = this.modal.querySelector('.close-btn');
    const cancelBtn = this.modal.querySelector('.cancel-btn');
    const overlay = this.modal.querySelector('.modal-overlay');

    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
  }

  // 显示分P选择器
  show(pages) {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;

      // 渲染分P列表
      this.renderPages(pages);
      
      // 显示模态框
      this.modal.style.display = 'block';
      
      // 添加动画效果
      setTimeout(() => {
        this.modal.style.opacity = '1';
      }, 10);
    });
  }

  renderPages(pages) {
    const pagesList = this.modal.querySelector('.pages-list');
    
    pagesList.innerHTML = pages.map((page, index) => `
      <div class="page-item" data-index="${index}" data-cid="${page.cid}">
        <div class="page-title">P${index + 1}: ${this.formatPageTitle(page.part)}</div>
        <div class="page-info">时长: ${this.formatDuration(page.duration)}</div>
      </div>
    `).join('');

    // 绑定点击事件
    pagesList.addEventListener('click', (e) => {
      const pageItem = e.target.closest('.page-item');
      if (pageItem) {
        const index = parseInt(pageItem.dataset.index);
        const cid = pageItem.dataset.cid;
        this.selectPage(index, cid, pages[index]);
      }
    });
  }

  formatPageTitle(title) {
    return title || '未命名分P';
  }

  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  selectPage(index, cid, page) {
    if (this.resolve) {
      this.resolve({
        index,
        cid,
        page
      });
    }
    this.close();
  }

  close() {
    this.modal.style.display = 'none';
    if (this.reject) {
      this.reject(new Error('用户取消选择'));
    }
    this.resolve = null;
    this.reject = null;
  }
}

// 导出到全局
window.PageSelector = PageSelector; 