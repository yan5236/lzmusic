// 自定义标题栏组件
class TitleBar {
  constructor() {
    this.minimizeBtn = document.getElementById('minimizeBtn');
    this.maximizeBtn = document.getElementById('maximizeBtn');
    this.closeBtn = document.getElementById('closeBtn');
    this.isMaximized = false;
    
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
      if (window.electronAPI && window.electronAPI.window) {
        await window.electronAPI.window.close();
      }
    } catch (error) {
      console.error('关闭窗口失败:', error);
      // 如果Electron API不可用，尝试使用传统方法
      if (window.close) {
        window.close();
      }
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
}

// 导出
window.TitleBar = TitleBar; 