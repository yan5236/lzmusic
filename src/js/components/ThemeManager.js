// 主题管理组件
class ThemeManager {
  constructor() {
    this.storage = new Storage();
    this.defaultThemes = this.getDefaultThemes();
    this.currentTheme = this.loadTheme();
    this.customBackgrounds = this.loadCustomBackgrounds();
    
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.bindEvents();
  }

  // 获取默认主题配置
  getDefaultThemes() {
    return {
      'sky-blue': {
        name: '天蓝色',
        primaryColor: '#00bfff',
        primaryDark: '#0099cc',
        primaryHover: '#0099cc',
        primaryLight: '#87ceeb',
        shadowColor: 'rgba(0, 191, 255, 0.15)',
        gradientStart: '#00bfff',
        gradientEnd: '#87ceeb'
      },
      'purple': {
        name: '紫色',
        primaryColor: '#8b5cf6',
        primaryDark: '#7c3aed',
        primaryHover: '#7c3aed',
        primaryLight: '#a78bfa',
        shadowColor: 'rgba(139, 92, 246, 0.15)',
        gradientStart: '#8b5cf6',
        gradientEnd: '#a78bfa'
      },
      'green': {
        name: '绿色',
        primaryColor: '#10b981',
        primaryDark: '#059669',
        primaryHover: '#059669',
        primaryLight: '#34d399',
        shadowColor: 'rgba(16, 185, 129, 0.15)',
        gradientStart: '#10b981',
        gradientEnd: '#34d399'
      },
      'pink': {
        name: '粉色',
        primaryColor: '#ec4899',
        primaryDark: '#db2777',
        primaryHover: '#db2777',
        primaryLight: '#f472b6',
        shadowColor: 'rgba(236, 72, 153, 0.15)',
        gradientStart: '#ec4899',
        gradientEnd: '#f472b6'
      },
      'orange': {
        name: '橙色',
        primaryColor: '#f59e0b',
        primaryDark: '#d97706',
        primaryHover: '#d97706',
        primaryLight: '#fbbf24',
        shadowColor: 'rgba(245, 158, 11, 0.15)',
        gradientStart: '#f59e0b',
        gradientEnd: '#fbbf24'
      },
      'red': {
        name: '红色',
        primaryColor: '#ef4444',
        primaryDark: '#dc2626',
        primaryHover: '#dc2626',
        primaryLight: '#f87171',
        shadowColor: 'rgba(239, 68, 68, 0.15)',
        gradientStart: '#ef4444',
        gradientEnd: '#f87171'
      }
    };
  }

  // 应用主题
  applyTheme(theme) {
    const root = document.documentElement;
    
    // 应用主题色
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--primary-dark', theme.primaryDark);
    root.style.setProperty('--primary-hover', theme.primaryHover);
    root.style.setProperty('--primary-light', theme.primaryLight);
    root.style.setProperty('--shadow-medium', `0 4px 16px ${theme.shadowColor}`);
    root.style.setProperty('--shadow-light', `0 2px 8px ${theme.shadowColor}`);
    
    // 更新RGB值用于半透明背景
    const rgb = this.hexToRgb(theme.primaryColor);
    if (rgb) {
      root.style.setProperty('--primary-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }

    // 应用背景图片
    if (theme.backgroundImage) {
      this.applyBackgroundImage(theme.backgroundImage, theme.backgroundOpacity || 0.5);
    } else {
      this.removeBackgroundImage();
    }

    // 应用播放器主题
    if (theme.playerTheme) {
      this.applyPlayerTheme(theme.playerTheme);
    }

    this.currentTheme = theme;
  }

  // 应用背景图片
  applyBackgroundImage(imageUrl, opacity = 0.5) {
    const body = document.body;
    const overlay = document.querySelector('.background-overlay') || this.createBackgroundOverlay();
    
    body.style.backgroundImage = `url(${imageUrl})`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundRepeat = 'no-repeat';
    
    // 修正透明度逻辑：opacity值越高，背景图片越清晰
    // 直接设置叠加层的rgba背景色
    const overlayOpacity = 1 - opacity;
    overlay.style.background = `rgba(0, 0, 0, ${overlayOpacity})`;
  }

  // 移除背景图片
  removeBackgroundImage() {
    const body = document.body;
    const overlay = document.querySelector('.background-overlay');
    
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundAttachment = '';
    body.style.backgroundRepeat = '';
    
    if (overlay) {
      overlay.style.background = 'rgba(0, 0, 0, 0)';
    }
  }

  // 创建背景叠加层
  createBackgroundOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'background-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      pointer-events: none;
      z-index: 1;
      transition: background 0.3s ease;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  // 应用播放器主题
  applyPlayerTheme(playerTheme) {
    const playerBar = document.getElementById('playerBar');
    if (!playerBar) return;

    const theme = this.defaultThemes[this.currentTheme.id] || this.defaultThemes['sky-blue'];
    
    switch (playerTheme) {
      case 'gradient':
        playerBar.style.background = `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})`;
        playerBar.style.backdropFilter = '';
        break;
      case 'glass':
        playerBar.style.background = `rgba(${this.hexToRgb(theme.primaryColor).r}, ${this.hexToRgb(theme.primaryColor).g}, ${this.hexToRgb(theme.primaryColor).b}, 0.1)`;
        playerBar.style.backdropFilter = 'blur(10px)';
        break;
      case 'solid':
        playerBar.style.background = theme.primaryColor;
        playerBar.style.backdropFilter = '';
        break;
      default:
        playerBar.style.background = '';
        playerBar.style.backdropFilter = '';
    }
  }

  // 十六进制颜色转RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // 切换主题
  switchTheme(themeId) {
    const theme = this.defaultThemes[themeId];
    if (theme) {
      const newTheme = {
        ...this.currentTheme,
        ...theme,
        id: themeId
      };
      this.applyTheme(newTheme);
      this.saveTheme(newTheme);
    }
  }

  // 设置背景图片
  setBackgroundImage(imageUrl, opacity = 0.5) {
    const newTheme = {
      ...this.currentTheme,
      backgroundImage: imageUrl,
      backgroundOpacity: opacity
    };
    this.applyTheme(newTheme);
    this.saveTheme(newTheme);
  }

  // 设置播放器主题
  setPlayerTheme(playerTheme) {
    const newTheme = {
      ...this.currentTheme,
      playerTheme: playerTheme
    };
    this.applyTheme(newTheme);
    this.saveTheme(newTheme);
  }

  // 保存自定义背景
  saveCustomBackground(name, imageUrl) {
    this.customBackgrounds[name] = imageUrl;
    this.storage.set('customBackgrounds', this.customBackgrounds);
  }

  // 删除自定义背景
  removeCustomBackground(name) {
    delete this.customBackgrounds[name];
    this.storage.set('customBackgrounds', this.customBackgrounds);
  }

  // 加载主题配置
  loadTheme() {
    const saved = this.storage.get('currentTheme');
    if (saved) {
      return saved;
    }
    
    // 返回默认主题
    return {
      ...this.defaultThemes['sky-blue'],
      id: 'sky-blue',
      backgroundImage: null,
      backgroundOpacity: 0.5,
      playerTheme: 'default'
    };
  }

  // 保存主题配置
  saveTheme(theme) {
    this.storage.set('currentTheme', theme);
  }

  // 加载自定义背景
  loadCustomBackgrounds() {
    return this.storage.get('customBackgrounds', {});
  }

  // 绑定事件
  bindEvents() {
    // 监听文件拖拽上传背景图片
    this.bindFileDropEvents();
  }

  // 绑定文件拖拽事件
  bindFileDropEvents() {
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => file.type.startsWith('image/'));
      
      if (imageFile) {
        this.handleBackgroundImageUpload(imageFile);
      }
    });
  }

  // 处理背景图片上传
  handleBackgroundImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      this.setBackgroundImage(imageUrl);
      
      // 触发主题更新事件
      const event = new CustomEvent('themeUpdated', {
        detail: { type: 'background', imageUrl }
      });
      document.dispatchEvent(event);
    };
    reader.readAsDataURL(file);
  }

  // 获取当前主题
  getCurrentTheme() {
    return this.currentTheme;
  }

  // 获取所有主题
  getAllThemes() {
    const themes = { ...this.defaultThemes };
    
    // 如果当前主题是自定义主题，添加到主题列表中
    if (this.currentTheme.id === 'custom') {
      themes.custom = {
        name: '自定义',
        primaryColor: this.currentTheme.primaryColor,
        primaryDark: this.currentTheme.primaryDark,
        primaryHover: this.currentTheme.primaryHover,
        primaryLight: this.currentTheme.primaryLight,
        shadowColor: this.currentTheme.shadowColor,
        gradientStart: this.currentTheme.gradientStart,
        gradientEnd: this.currentTheme.gradientEnd
      };
    }
    
    return themes;
  }

  // 获取自定义背景
  getCustomBackgrounds() {
    return this.customBackgrounds;
  }

  // 重置主题
  resetTheme() {
    const defaultTheme = {
      id: 'sky-blue',
      ...this.defaultThemes['sky-blue'],
      playerTheme: 'default'
    };
    this.applyTheme(defaultTheme);
    this.saveTheme(defaultTheme);
    return defaultTheme;
  }

  // 设置自定义主题
  setCustomTheme(primaryColor) {
    const customTheme = this.generateCustomTheme(primaryColor);
    this.applyTheme(customTheme);
    this.saveTheme(customTheme);
    return customTheme;
  }

  // 生成自定义主题
  generateCustomTheme(primaryColor) {
    const rgb = this.hexToRgb(primaryColor);
    if (!rgb) return null;

    // 生成深色版本（降低亮度）
    const primaryDark = this.adjustBrightness(primaryColor, -20);
    
    // 生成浅色版本（提高亮度）
    const primaryLight = this.adjustBrightness(primaryColor, 20);
    
    // 生成悬停色（稍微深一点）
    const primaryHover = this.adjustBrightness(primaryColor, -10);

    return {
      id: 'custom',
      name: '自定义',
      primaryColor: primaryColor,
      primaryDark: primaryDark,
      primaryHover: primaryHover,
      primaryLight: primaryLight,
      shadowColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
      gradientStart: primaryColor,
      gradientEnd: primaryLight,
      playerTheme: this.currentTheme.playerTheme || 'default'
    };
  }

  // 调整颜色亮度
  adjustBrightness(hexColor, percent) {
    const rgb = this.hexToRgb(hexColor);
    if (!rgb) return hexColor;

    const adjust = (color) => {
      const adjusted = Math.round(color + (color * percent / 100));
      return Math.max(0, Math.min(255, adjusted));
    };

    const r = adjust(rgb.r);
    const g = adjust(rgb.g);
    const b = adjust(rgb.b);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

// 导出
window.ThemeManager = ThemeManager; 