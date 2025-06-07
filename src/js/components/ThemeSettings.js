// 主题设置组件
class ThemeSettings {
  constructor(themeManager) {
    this.themeManager = themeManager;
    this.container = null;
    this.isVisible = false;
    
    this.init();
  }

  init() {
    // 获取主题设置容器
    this.container = document.getElementById('themeSettingsContainer');
    if (!this.container) {
      console.error('主题设置容器不存在');
      return;
    }

    // 创建设置界面
    this.createSettingsInterface();
  }

  // 创建设置界面
  createSettingsInterface() {
    if (!this.container) return;

    // 生成HTML内容
    this.container.innerHTML = this.createThemeSettingsHTML();
    
    // 绑定事件
    this.bindEvents();
    
    // 更新界面状态
    this.updateInterface();
  }

  // 创建主题设置HTML
  createThemeSettingsHTML() {
    const themes = this.themeManager.getAllThemes();
    const currentTheme = this.themeManager.getCurrentTheme();
    const customBackgrounds = this.themeManager.getCustomBackgrounds();

    return `
      <h3>主题设置</h3>
      
      <!-- 主题色选择 -->
      <div class="setting-item theme-colors-section">
        <label class="section-label">主题色彩</label>
        <div class="theme-colors-grid">
          ${Object.entries(themes).map(([id, theme]) => `
            <div class="theme-color-option ${currentTheme.id === id ? 'active' : ''}" 
                 data-theme-id="${id}">
              <div class="theme-color-preview" style="background: ${theme.primaryColor}"></div>
              <span class="theme-color-name">${theme.name}</span>
            </div>
          `).join('')}
          
          <!-- 自定义颜色选项 -->
          <div class="theme-color-option custom-color-option ${currentTheme.id === 'custom' ? 'active' : ''}" 
               data-theme-id="custom">
            <div class="theme-color-preview custom-color-preview" 
                 style="background: ${currentTheme.id === 'custom' ? currentTheme.primaryColor : '#666666'}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <span class="theme-color-name">自定义</span>
          </div>
        </div>
        
        <!-- 自定义颜色设置面板 -->
        <div class="custom-color-panel" id="customColorPanel" style="display: none;">
          <div class="custom-color-controls">
            <div class="color-input-group">
              <label for="colorPicker">颜色选择器</label>
              <input type="color" id="colorPicker" value="#00bfff">
            </div>
            <div class="color-input-group">
              <label for="colorCode">颜色代码</label>
              <input type="text" id="colorCode" placeholder="#00bfff" maxlength="7">
            </div>
            <div class="custom-color-actions">
              <button type="button" class="apply-custom-color-btn">应用颜色</button>
              <button type="button" class="cancel-custom-color-btn">取消</button>
            </div>
          </div>
          <div class="color-preview-section">
            <div class="color-preview-label">预览效果</div>
            <div class="color-preview-demo" id="colorPreviewDemo">
              <div class="preview-element">主题色预览</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 背景图片设置 -->
      <div class="setting-item background-section">
        <label class="section-label">背景图片</label>
        <div class="background-settings">
          <div class="background-upload-area" id="backgroundUploadArea">
            <div class="upload-hint">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              <p>点击选择或拖拽图片到此处</p>
              <span>支持 JPG、PNG、GIF 格式</span>
            </div>
            <input type="file" id="backgroundFileInput" accept="image/*" style="display: none;">
          </div>
          
          ${currentTheme.backgroundImage ? `
            <div class="current-background">
              <img src="${currentTheme.backgroundImage}" alt="当前背景">
              <div class="background-actions">
                <button class="remove-background-btn" type="button">移除背景</button>
              </div>
            </div>
          ` : ''}
          
          <div class="background-opacity-control">
            <label for="backgroundOpacity">背景可见度</label>
            <div class="opacity-slider-container">
              <input type="range" id="backgroundOpacity" min="0" max="1" step="0.05" 
                     value="${currentTheme.backgroundOpacity || 0.5}">
              <span class="opacity-value">${Math.round((currentTheme.backgroundOpacity || 0.5) * 100)}%</span>
            </div>
          </div>

          ${Object.keys(customBackgrounds).length > 0 ? `
            <div class="custom-backgrounds">
              <h4>自定义背景</h4>
              <div class="custom-backgrounds-grid">
                ${Object.entries(customBackgrounds).map(([name, url]) => `
                  <div class="custom-background-item">
                    <img src="${url}" alt="${name}">
                    <div class="custom-background-actions">
                      <button class="use-background-btn" data-bg-url="${url}">使用</button>
                      <button class="delete-background-btn" data-bg-name="${name}">删除</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 播放器主题 -->
      <div class="setting-item player-theme-section">
        <label class="section-label">播放器样式</label>
        <div class="player-theme-options">
          <div class="player-theme-option ${currentTheme.playerTheme === 'default' ? 'active' : ''}" 
               data-player-theme="default">
            <div class="player-theme-preview default-preview"></div>
            <span>默认</span>
          </div>
          <div class="player-theme-option ${currentTheme.playerTheme === 'gradient' ? 'active' : ''}" 
               data-player-theme="gradient">
            <div class="player-theme-preview gradient-preview"></div>
            <span>渐变</span>
          </div>
          <div class="player-theme-option ${currentTheme.playerTheme === 'glass' ? 'active' : ''}" 
               data-player-theme="glass">
            <div class="player-theme-preview glass-preview"></div>
            <span>毛玻璃</span>
          </div>
          <div class="player-theme-option ${currentTheme.playerTheme === 'solid' ? 'active' : ''}" 
               data-player-theme="solid">
            <div class="player-theme-preview solid-preview"></div>
            <span>纯色</span>
          </div>
        </div>
      </div>

      <!-- 重置按钮 -->
      <div class="setting-item">
        <div class="theme-reset-actions">
          <button class="reset-theme-btn" type="button">恢复默认主题</button>
        </div>
      </div>
    `;
  }

  // 绑定事件
  bindEvents() {
    if (!this.container) return;

    // 主题色选择
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.theme-color-option')) {
        const option = e.target.closest('.theme-color-option');
        const themeId = option.dataset.themeId;
        
        if (themeId === 'custom') {
          this.showCustomColorPanel();
        } else {
          this.selectThemeColor(themeId);
        }
      }
    });

    // 自定义颜色面板事件
    this.bindCustomColorEvents();

    // 背景图片上传
    const uploadArea = this.container.querySelector('#backgroundUploadArea');
    const fileInput = this.container.querySelector('#backgroundFileInput');
    
    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', () => fileInput.click());
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleBackgroundUpload(file);
        }
      });

      // 拖拽上传
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
      });

      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
      });

      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(file => file.type.startsWith('image/'));
        if (imageFile) {
          this.handleBackgroundUpload(imageFile);
        }
      });
    }

    // 移除背景 - 使用事件委托
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-background-btn')) {
        this.removeBackground();
      }
    });

    // 背景透明度调节
    const opacitySlider = this.container.querySelector('#backgroundOpacity');
    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        const opacity = parseFloat(e.target.value);
        this.updateBackgroundOpacity(opacity);
      });
    }

    // 播放器主题选择
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.player-theme-option')) {
        const option = e.target.closest('.player-theme-option');
        const playerTheme = option.dataset.playerTheme;
        this.selectPlayerTheme(playerTheme);
      }
    });

    // 自定义背景操作
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('use-background-btn')) {
        const bgUrl = e.target.dataset.bgUrl;
        this.themeManager.setBackgroundImage(bgUrl);
        this.updateInterface();
      }

      if (e.target.classList.contains('delete-background-btn')) {
        const bgName = e.target.dataset.bgName;
        this.deleteCustomBackground(bgName);
      }
    });

    // 重置主题
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('reset-theme-btn')) {
        this.resetTheme();
      }
    });

    // 监听主题更新事件
    document.addEventListener('themeUpdated', () => {
      this.updateInterface();
    });
  }

  // 选择主题色
  selectThemeColor(themeId) {
    this.themeManager.switchTheme(themeId);
    this.updateThemeColorSelection(themeId);
    this.updatePlayerThemePreviews();
  }

  // 选择播放器主题
  selectPlayerTheme(playerTheme) {
    this.themeManager.setPlayerTheme(playerTheme);
    this.updatePlayerThemeSelection(playerTheme);
  }

  // 处理背景图片上传
  handleBackgroundUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      this.themeManager.setBackgroundImage(imageUrl);
      this.updateInterface();
    };
    reader.readAsDataURL(file);
  }

  // 移除背景
  removeBackground() {
    this.themeManager.setBackgroundImage(null);
    this.updateInterface();
  }

  // 更新背景透明度
  updateBackgroundOpacity(opacity) {
    const currentTheme = this.themeManager.getCurrentTheme();
    if (currentTheme.backgroundImage) {
      this.themeManager.setBackgroundImage(currentTheme.backgroundImage, opacity);
    }
    
    // 更新显示值
    const opacityValue = this.container.querySelector('.opacity-value');
    if (opacityValue) {
      opacityValue.textContent = `${Math.round(opacity * 100)}%`;
    }
  }

  // 删除自定义背景
  deleteCustomBackground(name) {
    this.themeManager.removeCustomBackground(name);
    this.updateInterface();
  }

  // 重置主题
  async resetTheme() {
    const confirmed = await window.customDialog.confirm(
      '恢复默认主题',
      '确定要恢复默认主题吗？这将清除所有自定义设置。',
      '恢复默认',
      '取消'
    );
    
    if (confirmed) {
      this.themeManager.resetTheme();
      this.updateInterface();
    }
  }

  // 更新界面状态
  updateInterface() {
    if (!this.container) return;

    // 只更新需要更新的部分，避免重新创建整个界面
    this.updateThemeColorSelection();
    this.updatePlayerThemeSelection();
    this.updatePlayerThemePreviews();
    this.updateBackgroundDisplay();
  }

  // 更新主题色选择状态
  updateThemeColorSelection(selectedId = null) {
    const currentTheme = this.themeManager.getCurrentTheme();
    const activeId = selectedId || currentTheme.id;
    
    const options = this.container.querySelectorAll('.theme-color-option');
    options.forEach(option => {
      option.classList.toggle('active', option.dataset.themeId === activeId);
    });
  }

  // 更新播放器主题选择状态
  updatePlayerThemeSelection(selectedTheme = null) {
    const currentTheme = this.themeManager.getCurrentTheme();
    const activeTheme = selectedTheme || currentTheme.playerTheme || 'default';
    
    const options = this.container.querySelectorAll('.player-theme-option');
    options.forEach(option => {
      option.classList.toggle('active', option.dataset.playerTheme === activeTheme);
    });
  }

  // 更新播放器主题预览
  updatePlayerThemePreviews() {
    const currentTheme = this.themeManager.getCurrentTheme();
    let themeData;
    
    if (currentTheme.id === 'custom') {
      // 使用当前自定义主题数据
      themeData = currentTheme;
    } else {
      // 使用预定义主题数据
      themeData = this.themeManager.getAllThemes()[currentTheme.id];
    }
    
    if (!themeData) return;

    // 更新预览样式
    const previews = this.container.querySelectorAll('.player-theme-preview');
    previews.forEach(preview => {
      if (preview.classList.contains('gradient-preview')) {
        preview.style.background = `linear-gradient(135deg, ${themeData.gradientStart}, ${themeData.gradientEnd})`;
      } else if (preview.classList.contains('glass-preview')) {
        const rgb = this.themeManager.hexToRgb(themeData.primaryColor);
        preview.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
        preview.style.backdropFilter = 'blur(10px)';
      } else if (preview.classList.contains('solid-preview')) {
        preview.style.background = themeData.primaryColor;
      }
    });
  }

  // 更新背景显示
  updateBackgroundDisplay() {
    const currentTheme = this.themeManager.getCurrentTheme();
    
    // 更新透明度滑块
    const opacitySlider = this.container.querySelector('#backgroundOpacity');
    const opacityValue = this.container.querySelector('.opacity-value');
    if (opacitySlider && opacityValue) {
      const opacity = currentTheme.backgroundOpacity || 0.5;
      opacitySlider.value = opacity;
      opacityValue.textContent = `${Math.round(opacity * 100)}%`;
    }

    // 更新当前背景预览
    const uploadArea = this.container.querySelector('#backgroundUploadArea');
    if (uploadArea) {
      // 如果有背景图片，在上传区域旁边显示当前背景
      const existingCurrentBg = this.container.querySelector('.current-background');
      if (existingCurrentBg) {
        existingCurrentBg.remove();
      }

      if (currentTheme.backgroundImage) {
        const currentBgHTML = `
          <div class="current-background">
            <img src="${currentTheme.backgroundImage}" alt="当前背景">
            <div class="background-actions">
              <button class="remove-background-btn" type="button">移除背景</button>
            </div>
          </div>
        `;
        uploadArea.insertAdjacentHTML('afterend', currentBgHTML);
      }
    }
  }

  // 显示设置界面
  show() {
    this.isVisible = true;
    if (this.container) {
      this.container.style.display = 'block';
      this.updateInterface();
    }
  }

  // 隐藏设置界面
  hide() {
    this.isVisible = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  // 显示自定义颜色面板
  showCustomColorPanel() {
    const customColorPanel = this.container.querySelector('#customColorPanel');
    if (customColorPanel) {
      customColorPanel.style.display = 'block';
      
      // 初始化颜色值
      const currentTheme = this.themeManager.getCurrentTheme();
      const colorPicker = customColorPanel.querySelector('#colorPicker');
      const colorCode = customColorPanel.querySelector('#colorCode');
      
      if (currentTheme.id === 'custom' && currentTheme.primaryColor) {
        colorPicker.value = currentTheme.primaryColor;
        colorCode.value = currentTheme.primaryColor;
      } else {
        colorPicker.value = '#00bfff';
        colorCode.value = '#00bfff';
      }
      
      this.updateColorPreview(colorPicker.value);
    }
  }

  // 绑定自定义颜色相关的事件
  bindCustomColorEvents() {
    const customColorPanel = this.container.querySelector('#customColorPanel');
    if (!customColorPanel) return;

    const colorPicker = customColorPanel.querySelector('#colorPicker');
    const colorCode = customColorPanel.querySelector('#colorCode');
    const applyBtn = customColorPanel.querySelector('.apply-custom-color-btn');
    const cancelBtn = customColorPanel.querySelector('.cancel-custom-color-btn');

    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        colorCode.value = color;
        this.updateColorPreview(color);
      });
    }

    if (colorCode) {
      colorCode.addEventListener('input', (e) => {
        let color = e.target.value.trim();
        
        // 自动添加#号
        if (color && !color.startsWith('#')) {
          color = '#' + color;
          e.target.value = color;
        }
        
        // 验证颜色格式
        if (this.isValidHexColor(color)) {
          colorPicker.value = color;
          this.updateColorPreview(color);
        }
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const color = colorPicker.value;
        if (this.isValidHexColor(color)) {
          this.applyCustomColor(color);
          customColorPanel.style.display = 'none';
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        customColorPanel.style.display = 'none';
      });
    }
  }

  // 应用自定义颜色
  applyCustomColor(color) {
    this.themeManager.setCustomTheme(color);
    this.updateThemeColorSelection('custom');
    this.updatePlayerThemePreviews();
    
    // 更新自定义颜色预览
    const customColorPreview = this.container.querySelector('.custom-color-preview');
    if (customColorPreview) {
      customColorPreview.style.background = color;
    }
  }

  // 更新颜色预览
  updateColorPreview(color) {
    const previewDemo = this.container.querySelector('#colorPreviewDemo');
    if (previewDemo) {
      const previewElement = previewDemo.querySelector('.preview-element');
      if (previewElement) {
        previewElement.style.background = color;
        previewElement.style.color = this.getContrastColor(color);
      }
    }
  }

  // 验证十六进制颜色格式
  isValidHexColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  // 获取对比色（用于文字颜色）
  getContrastColor(hexColor) {
    // 将十六进制转换为RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // 计算亮度
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // 根据亮度返回黑色或白色
    return brightness > 128 ? '#000000' : '#ffffff';
  }
}

// 导出
window.ThemeSettings = ThemeSettings; 