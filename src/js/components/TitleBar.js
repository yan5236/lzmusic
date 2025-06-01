// 自定义标题栏组件
class TitleBar {
  constructor() {
    this.minimizeBtn = document.getElementById('minimizeBtn');
    this.maximizeBtn = document.getElementById('maximizeBtn');
    this.closeBtn = document.getElementById('closeBtn');
    this.isMaximized = false;
    this.settings = new Settings(); // 添加设置实例
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.updateMaximizeButton();
  }
  
  bindEvents() {
    // 最小化按钮
    this.minimizeBtn.addEventListener('click', () => {
      this.minimize();
    });
    
    // 最大化/还原按钮
    this.maximizeBtn.addEventListener('click', () => {
      this.toggleMaximize();
    });
    
    // 关闭按钮
    this.closeBtn.addEventListener('click', () => {
      this.close();
    });
    
    // 双击标题栏区域切换最大化
    const dragRegion = document.querySelector('.titlebar-drag-region');
    if (dragRegion) {
      dragRegion.addEventListener('dblclick', () => {
        this.toggleMaximize();
      });
    }
  }
  
  async minimize() {
    try {
      if (window.electronAPI && window.electronAPI.window) {
        await window.electronAPI.window.minimize();
      }
    } catch (error) {
      console.error('最小化窗口失败:', error);
    }
  }
  
  async toggleMaximize() {
    try {
      if (window.electronAPI && window.electronAPI.window) {
        await window.electronAPI.window.maximize();
        // 更新按钮状态
        setTimeout(() => {
          this.updateMaximizeButton();
        }, 100);
      }
    } catch (error) {
      console.error('切换最大化状态失败:', error);
    }
  }
  
  async close() {
    try {
      const settings = this.settings.get();
      const closeAction = settings.closeAction || 'ask';
      const dontAskAgain = settings.dontAskAgain || false;
      
      // 如果设置为询问且没有选择"不再询问"，显示确认对话框
      if (closeAction === 'ask' && !dontAskAgain) {
        this.showCloseConfirmDialog();
        return;
      }
      
      // 根据设置执行相应操作
      if (closeAction === 'minimize') {
        this.minimizeToTray();
      } else {
        this.forceClose();
      }
    } catch (error) {
      console.error('处理关闭操作失败:', error);
      this.forceClose();
    }
  }
  
  async updateMaximizeButton() {
    try {
      if (window.electronAPI && window.electronAPI.window) {
        this.isMaximized = await window.electronAPI.window.isMaximized();
        
        const maximizeIcon = this.maximizeBtn.querySelector('svg:first-child');
        const restoreIcon = this.maximizeBtn.querySelector('.restore-icon');
        
        if (this.isMaximized) {
          this.maximizeBtn.classList.add('maximized');
          this.maximizeBtn.title = '还原';
          if (maximizeIcon) maximizeIcon.style.display = 'none';
          if (restoreIcon) restoreIcon.style.display = 'block';
        } else {
          this.maximizeBtn.classList.remove('maximized');
          this.maximizeBtn.title = '最大化';
          if (maximizeIcon) maximizeIcon.style.display = 'block';
          if (restoreIcon) restoreIcon.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('更新最大化按钮状态失败:', error);
    }
  }
  
  // 设置标题
  setTitle(title) {
    const titleElement = document.querySelector('.titlebar-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }
  
  // 设置窗口焦点状态
  setWindowFocus(focused) {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      if (focused) {
        appContainer.classList.remove('window-blurred');
      } else {
        appContainer.classList.add('window-blurred');
      }
    }
  }
  
  // 显示关闭确认对话框
  showCloseConfirmDialog() {
    // 移除已存在的对话框
    const existingDialog = document.getElementById('closeConfirmDialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // 创建对话框元素
    const dialog = document.createElement('div');
    dialog.id = 'closeConfirmDialog';
    dialog.className = 'close-confirm-dialog';
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>关闭确认</h3>
        </div>
        <div class="dialog-body">
          <p>您希望如何处理程序窗口？</p>
          <div class="dialog-options">
            <label class="dialog-option">
              <input type="radio" name="closeOption" value="close" checked>
              <span>关闭程序</span>
            </label>
            <label class="dialog-option">
              <input type="radio" name="closeOption" value="minimize">
              <span>最小化到系统托盘</span>
            </label>
          </div>
          <div class="dialog-checkbox">
            <label>
              <input type="checkbox" id="dontAskAgainCheckbox">
              <span>不再询问，记住我的选择</span>
            </label>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn cancel-btn" id="dialogCancelBtn">取消</button>
          <button class="dialog-btn confirm-btn" id="dialogConfirmBtn">确定</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 添加事件监听器
    this.bindDialogEvents(dialog);
    
    // 显示对话框
    setTimeout(() => {
      dialog.classList.add('show');
    }, 10);
  }
  
  // 绑定对话框事件
  bindDialogEvents(dialog) {
    const cancelBtn = dialog.querySelector('#dialogCancelBtn');
    const confirmBtn = dialog.querySelector('#dialogConfirmBtn');
    const overlay = dialog.querySelector('.dialog-overlay');
    const dontAskCheckbox = dialog.querySelector('#dontAskAgainCheckbox');
    const dialogContent = dialog.querySelector('.dialog-content');
    
    // 阻止对话框内容的点击事件冒泡到遮罩层
    dialogContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // 为选项标签添加点击事件
    const radioLabels = dialog.querySelectorAll('.dialog-option');
    radioLabels.forEach(label => {
      label.addEventListener('click', (e) => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio && e.target !== radio) {
          radio.checked = true;
        }
      });
    });
    
    // 为复选框标签添加点击事件
    const checkboxLabel = dialog.querySelector('.dialog-checkbox label');
    if (checkboxLabel) {
      checkboxLabel.addEventListener('click', (e) => {
        const checkbox = checkboxLabel.querySelector('input[type="checkbox"]');
        if (checkbox && e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
      });
    }
    
    // 取消按钮
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideDialog(dialog);
    });
    
    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideDialog(dialog);
      }
    });
    
    // 确定按钮
    confirmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const selectedOption = dialog.querySelector('input[name="closeOption"]:checked').value;
      const dontAskAgain = dontAskCheckbox.checked;
      
      // 保存用户选择
      if (dontAskAgain) {
        this.settings.set('closeAction', selectedOption);
        this.settings.set('dontAskAgain', true);
      }
      
      this.hideDialog(dialog);
      
      // 延迟执行操作，确保对话框完全关闭
      setTimeout(() => {
        if (selectedOption === 'minimize') {
          this.minimizeToTray();
        } else {
          this.forceClose();
        }
      }, 100);
    });
    
    // ESC键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.hideDialog(dialog);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }
  
  // 隐藏对话框
  hideDialog(dialog) {
    dialog.classList.remove('show');
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, 300);
  }
  
  // 最小化到托盘
  async minimizeToTray() {
    try {
      if (window.electronAPI && window.electronAPI.window && window.electronAPI.window.minimizeToTray) {
        await window.electronAPI.window.minimizeToTray();
      } else {
        // 如果没有托盘API，则普通最小化
        this.minimize();
      }
    } catch (error) {
      console.error('最小化到托盘失败:', error);
      this.minimize();
    }
  }
  
  // 强制关闭窗口
  async forceClose() {
    try {
      if (window.electronAPI && window.electronAPI.window && window.electronAPI.window.forceClose) {
        await window.electronAPI.window.forceClose();
      } else {
        // 如果强制关闭API不可用，尝试使用普通关闭
        if (window.electronAPI && window.electronAPI.window) {
          await window.electronAPI.window.close();
        }
      }
    } catch (error) {
      console.error('强制关闭窗口失败:', error);
      // 如果Electron API不可用，尝试使用传统方法
      if (window.close) {
        window.close();
      }
    }
  }
}

// 导出
window.TitleBar = TitleBar; 