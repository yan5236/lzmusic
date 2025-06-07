// 自定义对话框工具类
class CustomDialog {
  constructor() {
    this.dialogContainer = null;
    this.currentResolve = null;
  }

  // 创建对话框HTML
  createDialogHTML(title, message, confirmText = '确定', cancelText = '取消') {
    return `
      <div class="custom-dialog-overlay"></div>
      <div class="custom-dialog-content">
        <div class="custom-dialog-header">
          <h3>${title}</h3>
        </div>
        <div class="custom-dialog-body">
          <p>${message}</p>
        </div>
        <div class="custom-dialog-footer">
          <button class="custom-dialog-btn cancel-btn" data-action="cancel">${cancelText}</button>
          <button class="custom-dialog-btn confirm-btn" data-action="confirm">${confirmText}</button>
        </div>
      </div>
    `;
  }

  // 显示确认对话框
  confirm(title, message, confirmText = '确定', cancelText = '取消') {
    return new Promise((resolve) => {
      this.currentResolve = resolve;
      this.showDialog(title, message, confirmText, cancelText);
    });
  }

  // 显示对话框
  showDialog(title, message, confirmText, cancelText) {
    // 移除已存在的对话框
    this.hideDialog();

    // 创建对话框容器
    this.dialogContainer = document.createElement('div');
    this.dialogContainer.className = 'custom-dialog';
    this.dialogContainer.innerHTML = this.createDialogHTML(title, message, confirmText, cancelText);

    // 添加到页面
    document.body.appendChild(this.dialogContainer);

    // 绑定事件
    this.bindDialogEvents();

    // 显示动画
    setTimeout(() => {
      this.dialogContainer.classList.add('show');
    }, 10);

    // 阻止页面滚动
    document.body.style.overflow = 'hidden';
  }

  // 隐藏对话框
  hideDialog() {
    if (this.dialogContainer) {
      this.dialogContainer.classList.remove('show');
      
      setTimeout(() => {
        if (this.dialogContainer && this.dialogContainer.parentNode) {
          this.dialogContainer.parentNode.removeChild(this.dialogContainer);
        }
        this.dialogContainer = null;
        
        // 恢复页面滚动
        document.body.style.overflow = '';
      }, 300);
    }
  }

  // 绑定对话框事件
  bindDialogEvents() {
    if (!this.dialogContainer) return;

    // 点击按钮
    this.dialogContainer.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        const result = action === 'confirm';
        this.resolveDialog(result);
      }
    });

    // 点击遮罩层关闭
    const overlay = this.dialogContainer.querySelector('.custom-dialog-overlay');
    overlay.addEventListener('click', () => {
      this.resolveDialog(false);
    });

    // ESC键关闭
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        this.resolveDialog(false);
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  // 处理对话框结果
  resolveDialog(result) {
    if (this.currentResolve) {
      this.currentResolve(result);
      this.currentResolve = null;
    }
    this.hideDialog();
  }
}

// 创建全局实例
window.customDialog = new CustomDialog(); 