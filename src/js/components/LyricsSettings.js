// 歌词设置组件
class LyricsSettings {
  constructor() {
    this.isOpen = false;
    this.lyricsData = null;
    this.settings = new Settings();
    this.currentLyrics = '';
    
    // 默认设置
    this.defaultSettings = {
      fontSize: 16,
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      fontFamily: 'Microsoft YaHei, sans-serif',
      lineHeight: 1.5,
      platform: 'netease', // 默认网易云
      showTranslation: false
    };
    
    this.lyricsSettings = this.settings.get('lyricsSettings', this.defaultSettings);
    this.init();
  }

  init() {
    this.createModal();
    this.bindEvents();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.className = 'lyrics-settings-modal';
    modal.id = 'lyricsSettingsModal';
    modal.innerHTML = `
      <div class="lyrics-settings-overlay"></div>
      <div class="lyrics-settings-content">
        <div class="lyrics-settings-header">
          <h3>歌词设置</h3>
          <button class="close-btn" id="closeLyricsSettings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div class="lyrics-settings-body">
          <div class="lyrics-settings-tabs">
            <button class="tab-btn active" data-tab="search">歌词搜索</button>
            <button class="tab-btn" data-tab="manual">手动输入</button>
            <button class="tab-btn" data-tab="style">样式设置</button>
          </div>
          
          <div class="tab-content active" id="searchTab">
            <div class="search-section">
              <div class="search-form">
                <div class="form-group">
                  <label>歌曲名称</label>
                  <input type="text" id="songNameInput" placeholder="请输入歌曲名称">
                </div>
                <div class="form-group">
                  <label>歌手</label>
                  <input type="text" id="artistInput" placeholder="请输入歌手名称">
                </div>
                <div class="form-group">
                  <label>平台选择</label>
                  <div class="platform-selection">
                    <label class="platform-option">
                      <input type="checkbox" value="netease" checked>
                      <span>网易云音乐</span>
                    </label>
                    <label class="platform-option">
                      <input type="checkbox" value="qq">
                      <span>QQ音乐</span>
                    </label>
                    <label class="platform-option">
                      <input type="checkbox" value="kugou">
                      <span>酷狗音乐</span>
                    </label>
                    <label class="platform-option">
                      <input type="checkbox" value="kuwo">
                      <span>酷我音乐</span>
                    </label>
                  </div>
                </div>
                <button class="search-btn" id="searchLyricsBtn">搜索歌词</button>
              </div>
              
              <div class="search-results" id="searchResults">
                <div class="loading" id="searchLoading" style="display: none;">
                  <div class="loading-spinner"></div>
                  <span>搜索中...</span>
                </div>
                <div class="results-list" id="resultsList"></div>
              </div>
            </div>
          </div>
          
          <div class="tab-content" id="manualTab">
            <div class="manual-section">
              <div class="form-group">
                <label>歌曲信息</label>
                <div style="display: flex; gap: 12px;">
                  <input type="text" id="manualSongName" placeholder="歌曲名称" style="flex: 1;">
                  <input type="text" id="manualArtist" placeholder="歌手名称" style="flex: 1;">
                </div>
              </div>
              <div class="form-group">
                <label>歌词内容</label>
                <textarea id="manualLyricsInput" placeholder="请输入歌词内容...&#10;&#10;格式示例：&#10;[00:00.00]歌曲开始&#10;[00:15.30]第一句歌词&#10;[00:30.60]第二句歌词&#10;&#10;也可以直接输入无时间轴的歌词文本" rows="15" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background-primary); color: var(--text-primary); font-family: monospace; font-size: 14px; line-height: 1.5; resize: vertical;"></textarea>
              </div>
              <div class="manual-actions">
                <button class="clear-lyrics-btn" id="clearManualLyrics">清空</button>
                <button class="use-lyrics-btn" id="useManualLyrics">使用此歌词</button>
              </div>
            </div>
          </div>
          
          <div class="tab-content" id="styleTab">
            <div class="style-section">
              <div class="form-group">
                <label>字体大小</label>
                <div class="range-input">
                  <input type="range" id="fontSizeRange" min="12" max="32" value="${this.lyricsSettings.fontSize}">
                  <span id="fontSizeValue">${this.lyricsSettings.fontSize}px</span>
                </div>
              </div>
              
              <div class="form-group">
                <label>字体颜色</label>
                <input type="color" id="fontColorPicker" value="${this.lyricsSettings.color}">
              </div>
              
              <div class="form-group">
                <label>背景颜色</label>
                <div class="background-options">
                  <input type="color" id="backgroundColorPicker" value="#000000">
                  <input type="range" id="backgroundOpacity" min="0" max="100" value="50">
                  <span>透明度: <span id="opacityValue">50%</span></span>
                </div>
              </div>
              
              <div class="form-group">
                <label>字体</label>
                <select id="fontFamilySelect">
                  <option value="Microsoft YaHei, sans-serif">微软雅黑</option>
                  <option value="SimSun, serif">宋体</option>
                  <option value="SimHei, sans-serif">黑体</option>
                  <option value="KaiTi, serif">楷体</option>
                  <option value="Arial, sans-serif">Arial</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>行高</label>
                <div class="range-input">
                  <input type="range" id="lineHeightRange" min="1" max="3" step="0.1" value="${this.lyricsSettings.lineHeight}">
                  <span id="lineHeightValue">${this.lyricsSettings.lineHeight}</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="showTranslation" ${this.lyricsSettings.showTranslation ? 'checked' : ''}>
                  显示翻译
                </label>
              </div>
              
              <div class="preview-section">
                <h4>预览</h4>
                <div class="lyrics-preview" id="lyricsPreview">
                  <p>这是歌词预览效果</p>
                  <p>可以看到字体、颜色和大小</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="lyrics-settings-footer">
          <button class="cancel-btn" id="cancelLyricsSettings">取消</button>
          <button class="save-btn" id="saveLyricsSettings">保存设置</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.modal = modal;
    this.updatePreview();
  }

  bindEvents() {
    // 标签切换
    this.modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // 关闭按钮
    this.modal.querySelector('#closeLyricsSettings').addEventListener('click', () => {
      this.close();
    });
    
    this.modal.querySelector('#cancelLyricsSettings').addEventListener('click', () => {
      this.close();
    });

    // 保存设置
    this.modal.querySelector('#saveLyricsSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    // 搜索歌词
    this.modal.querySelector('#searchLyricsBtn').addEventListener('click', () => {
      this.searchLyrics();
    });

    // 手动输入歌词相关事件
    this.modal.querySelector('#useManualLyrics').addEventListener('click', () => {
      this.useManualLyrics();
    });

    this.modal.querySelector('#clearManualLyrics').addEventListener('click', () => {
      this.clearManualLyrics();
    });

    // 样式设置事件
    this.bindStyleEvents();

    // 点击遮罩关闭
    this.modal.querySelector('.lyrics-settings-overlay').addEventListener('click', () => {
      this.close();
    });
  }

  bindStyleEvents() {
    const fontSizeRange = this.modal.querySelector('#fontSizeRange');
    const fontSizeValue = this.modal.querySelector('#fontSizeValue');
    const fontColorPicker = this.modal.querySelector('#fontColorPicker');
    const backgroundColorPicker = this.modal.querySelector('#backgroundColorPicker');
    const backgroundOpacity = this.modal.querySelector('#backgroundOpacity');
    const opacityValue = this.modal.querySelector('#opacityValue');
    const fontFamilySelect = this.modal.querySelector('#fontFamilySelect');
    const lineHeightRange = this.modal.querySelector('#lineHeightRange');
    const lineHeightValue = this.modal.querySelector('#lineHeightValue');
    const showTranslation = this.modal.querySelector('#showTranslation');

    fontSizeRange.addEventListener('input', (e) => {
      fontSizeValue.textContent = e.target.value + 'px';
      this.updatePreview();
    });

    fontColorPicker.addEventListener('input', () => {
      this.updatePreview();
    });

    backgroundColorPicker.addEventListener('input', () => {
      this.updatePreview();
    });

    backgroundOpacity.addEventListener('input', (e) => {
      opacityValue.textContent = e.target.value + '%';
      this.updatePreview();
    });

    fontFamilySelect.addEventListener('change', () => {
      this.updatePreview();
    });

    lineHeightRange.addEventListener('input', (e) => {
      lineHeightValue.textContent = e.target.value;
      this.updatePreview();
    });

    showTranslation.addEventListener('change', () => {
      this.updatePreview();
    });
  }

  switchTab(tabName) {
    // 切换标签按钮状态
    this.modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    this.modal.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 切换内容
    this.modal.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    this.modal.querySelector(`#${tabName}Tab`).classList.add('active');
  }

  updatePreview() {
    const preview = this.modal.querySelector('#lyricsPreview');
    const fontSize = this.modal.querySelector('#fontSizeRange').value;
    const fontColor = this.modal.querySelector('#fontColorPicker').value;
    const backgroundColor = this.modal.querySelector('#backgroundColorPicker').value;
    const backgroundOpacity = this.modal.querySelector('#backgroundOpacity').value;
    const fontFamily = this.modal.querySelector('#fontFamilySelect').value;
    const lineHeight = this.modal.querySelector('#lineHeightRange').value;

    const bgRgb = this.hexToRgb(backgroundColor);
    const bgColor = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${backgroundOpacity / 100})`;

    preview.style.fontSize = fontSize + 'px';
    preview.style.color = fontColor;
    preview.style.backgroundColor = bgColor;
    preview.style.fontFamily = fontFamily;
    preview.style.lineHeight = lineHeight;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // 自定义提示方法
  showMessage(message, type = 'info') {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `lyrics-toast lyrics-toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // 添加样式
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#28a745' : '#007bff'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10001;
      max-width: 300px;
      font-size: 14px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // 自动消失
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  async searchLyrics() {
    const songName = this.modal.querySelector('#songNameInput').value.trim();
    const artist = this.modal.querySelector('#artistInput').value.trim();
    const platforms = Array.from(this.modal.querySelectorAll('.platform-option input:checked'))
      .map(input => input.value);

    if (!songName) {
      this.showMessage('请输入歌曲名称', 'error');
      return;
    }

    if (platforms.length === 0) {
      this.showMessage('请选择至少一个搜索平台', 'error');
      return;
    }

    const loading = this.modal.querySelector('#searchLoading');
    const resultsList = this.modal.querySelector('#resultsList');
    
    loading.style.display = 'flex';
    resultsList.innerHTML = '';

    try {
      const results = await this.searchLyricsFromPlatforms(songName, artist, platforms);
      this.displaySearchResults(results);
      
      if (results.length > 0) {
        this.showMessage(`找到 ${results.length} 个歌词结果`, 'success');
      }
    } catch (error) {
      console.error('搜索歌词失败:', error);
      resultsList.innerHTML = '<div class="error-message">搜索失败，请重试</div>';
      this.showMessage('搜索失败，请重试', 'error');
    } finally {
      loading.style.display = 'none';
    }
  }

  async searchLyricsFromPlatforms(songName, artist, platforms) {
    const results = [];
    const searchKeyword = `${songName} ${artist || ''}`.trim();
    
    // 酷狗音乐API - 增加更多搜索结果
    if (platforms.includes('kugou')) {
      try {
        console.log('开始搜索酷狗歌词:', searchKeyword);
        
        // 使用酷狗搜索API - 增加搜索数量
        const searchUrl = `https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(searchKeyword)}&page=1&pagesize=50&userid=-1&clientver=&platform=WebFilter&tag=em&filter=2&iscorrection=1&privilege_filter=0&_=${Date.now()}`;
        
        console.log('酷狗搜索URL:', searchUrl);
        
        const searchResponse = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.kugou.com/',
            'Accept': 'application/json, text/javascript, */*; q=0.01'
          }
        });
        
        if (searchResponse.ok) {
          let responseText = await searchResponse.text();
          console.log('酷狗原始响应长度:', responseText.length);
          console.log('酷狗响应前200字符:', responseText.substring(0, 200));
          
          let searchData;
          try {
            // 直接解析JSON，不处理JSONP
            searchData = JSON.parse(responseText);
          } catch (parseError) {
            console.warn('酷狗搜索响应解析失败:', parseError);
            console.warn('响应内容前1000字符:', responseText.substring(0, 1000));
            
            // 尝试处理可能的JSONP格式
            try {
              // 查找JSON开始和结束位置
              const jsonStart = responseText.indexOf('{');
              const jsonEnd = responseText.lastIndexOf('}');
              
              if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
                searchData = JSON.parse(jsonStr);
                console.log('成功提取JSON数据');
              } else {
                throw new Error('无法找到有效的JSON数据');
              }
            } catch (secondParseError) {
              console.warn('二次解析也失败，跳过酷狗搜索');
              throw parseError;
            }
          }
          
          console.log('酷狗搜索结果数量:', searchData.data?.lists?.length || 0);
          
          if (searchData.data && searchData.data.lists && searchData.data.lists.length > 0) {
            // 取前15首歌曲的歌词（增加数量）
            for (let i = 0; i < Math.min(15, searchData.data.lists.length); i++) {
              const song = searchData.data.lists[i];
              
              try {
                // 获取歌词详情
                const lyricsSearchUrl = `https://krcs.kugou.com/search?ver=1&man=yes&client=mobi&keyword=&duration=${song.Duration}&hash=${song.FileHash}&album_audio_id=`;
                
                const lyricsSearchResponse = await fetch(lyricsSearchUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.kugou.com/'
                  }
                });
                
                if (lyricsSearchResponse.ok) {
                  const lyricsSearchData = await lyricsSearchResponse.json();
                  
                  if (lyricsSearchData.candidates && lyricsSearchData.candidates.length > 0) {
                    // 获取多个候选歌词（而不是只取第一个）
                    for (let j = 0; j < Math.min(3, lyricsSearchData.candidates.length); j++) {
                      const candidate = lyricsSearchData.candidates[j];
                      
                      // 获取歌词内容
                      const lyricsUrl = `https://lyrics.kugou.com/download?ver=1&client=pc&id=${candidate.id}&accesskey=${candidate.accesskey}&fmt=lrc&charset=utf8`;
                      
                      const lyricsResponse = await fetch(lyricsUrl, {
                        headers: {
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                          'Referer': 'https://www.kugou.com/'
                        }
                      });
                      
                      if (lyricsResponse.ok) {
                        let lyricsData = await lyricsResponse.text();
                        
                        try {
                          // 尝试解析JSON格式
                          const jsonData = JSON.parse(lyricsData);
                          if (jsonData.content) {
                            lyricsData = jsonData.content;
                            
                            // 如果内容是base64编码，尝试解码
                            try {
                              if (lyricsData && !lyricsData.includes('[') && /^[A-Za-z0-9+/]+=*$/.test(lyricsData.trim())) {
                                // Base64解码
                                const decodedBytes = atob(lyricsData);
                                
                                // 尝试UTF-8解码
                                try {
                                  lyricsData = decodeURIComponent(escape(decodedBytes));
                                } catch (utfError) {
                                  // 如果UTF-8解码失败，直接使用解码后的字节
                                  lyricsData = decodedBytes;
                                }
                                
                                console.log('Base64解码成功，歌词长度:', lyricsData.length);
                              }
                            } catch (decodeError) {
                              console.warn('base64解码失败:', decodeError);
                            }
                          }
                        } catch (parseError) {
                          // 如果不是JSON，直接使用文本内容
                          console.log('歌词内容为纯文本格式');
                        }
                        
                        // 修复可能的编码问题
                        if (lyricsData) {
                          // 处理常见的编码问题
                          lyricsData = lyricsData
                            .replace(/\ufffd/g, '') // 移除替换字符
                            .replace(/\u0000/g, '') // 移除空字符
                            .trim();
                        }
                        
                        // 过滤掉模版数据和无效歌词
                        if (lyricsData && lyricsData.trim() && 
                            !lyricsData.includes('作词') && 
                            !lyricsData.includes('作曲') && 
                            !lyricsData.includes('编曲') && 
                            !lyricsData.includes('制作人') &&
                            !lyricsData.includes('出品') &&
                            lyricsData.length > 50) {
                          
                          // 检查是否已存在相同歌词
                          const isDuplicate = results.some(result => 
                            result.platform === 'kugou' && 
                            result.lyrics === lyricsData
                          );
                          
                          if (!isDuplicate) {
                            results.push({
                              platform: 'kugou',
                              platformName: '酷狗音乐',
                              song: song.SongName?.replace(/<[^>]*>/g, '') || songName,
                              artist: song.SingerName || artist || '未知艺术家',
                              lyrics: lyricsData,
                              duration: this.formatDuration(song.Duration * 1000),
                              quality: candidate.score || 0 // 添加质量评分
                            });
                            
                            console.log('酷狗歌词添加成功:', song.SongName);
                          }
                        }
                      }
                    }
                  }
                }
              } catch (lyricError) {
                console.warn(`获取酷狗歌曲歌词失败:`, lyricError);
              }
              
              // 添加小延迟避免请求过快
              if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }
        }
      } catch (error) {
        console.warn('酷狗音乐API失败:', error);
      }
    }
    
    // 网易云音乐官方API - 优先使用官方API
    if (platforms.includes('netease')) {
      try {
        console.log('开始使用网易云官方API搜索歌词:', searchKeyword);
        
        // 使用我们的官方API包装器
        if (typeof neteaseAPI !== 'undefined') {
          const officialResults = await neteaseAPI.searchLyrics(songName, artist, 15);
          
          if (officialResults && officialResults.length > 0) {
            // 添加官方API结果到结果列表
            results.push(...officialResults);
            console.log('网易云官方API成功获取', officialResults.length, '个结果');
            
            // 如果找到官方API结果，就不再使用第三方API
            console.log('已获得网易云官方API结果，跳过第三方API');
          } else {
            console.log('网易云官方API未找到歌词');
            throw new Error('网易云官方API未找到歌词');
          }
        } else {
          console.warn('网易云API模块未加载');
          throw new Error('网易云API模块未加载');
        }
      } catch (error) {
        console.warn('网易云官方API调用失败:', error);
        
        // 官方API失败时，给出明确的错误提示
        if (error.message.includes('API服务器启动失败') || 
            error.message.includes('API服务器未运行')) {
          throw new Error('网易云音乐API服务器未启动，请确保应用已正确配置并启动API服务器');
        }
        
        // 如果官方API失败，不再使用第三方API，而是抛出错误
        throw new Error(`网易云官方API失败: ${error.message}`);
      }
    }

    /* 注释掉第三方API调用 - 现在只使用网易云官方API
    // 网易云音乐API - 使用落月API增加更多搜索结果
    if (platforms.includes('netease')) {
      try {
        console.log('开始使用落月API搜索网易云歌词:', searchKeyword);
        
        // 第一步：搜索歌曲获取ID列表
        const searchUrl = `https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(searchKeyword)}&page=1&num=20`;
        console.log('网易云搜索URL:', searchUrl);
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://music.163.com/'
          }
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          console.log('落月API搜索响应:', searchData);
          
          if (searchData.code === 200 && searchData.data) {
            // 处理搜索结果，可能是单个结果或数组
            let searchResults = [];
            if (Array.isArray(searchData.data)) {
              searchResults = searchData.data;
            } else {
              // 如果是单个结果，也放入数组中
              searchResults = [searchData.data];
            }
            
            console.log('网易云搜索结果数量:', searchResults.length);
            
            // 为每个搜索结果获取歌词
            for (let i = 0; i < Math.min(15, searchResults.length); i++) {
              const song = searchResults[i];
              
              if (!song.id) {
                console.warn('歌曲缺少ID，跳过:', song);
                continue;
              }
              
              try {
                // 第二步：使用歌曲ID获取歌词
                const lyricsUrl = `https://api.vkeys.cn/v2/music/netease/lyric?id=${song.id}`;
                console.log(`获取歌词 ${i+1}/${searchResults.length}:`, lyricsUrl);
                
                const lyricsResponse = await fetch(lyricsUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://music.163.com/'
                  }
                });
                
                if (lyricsResponse.ok) {
                  const lyricsData = await lyricsResponse.json();
                  console.log('歌词API响应:', lyricsData);
                  
                  if (lyricsData.code === 200 && lyricsData.data && lyricsData.data.lrc) {
                    let lyrics = lyricsData.data.lrc;
                    
                    // 过滤掉模版数据和无效歌词
                    if (lyrics && lyrics.trim() && 
                        !lyrics.includes('作词') && 
                        !lyrics.includes('作曲') && 
                        !lyrics.includes('编曲') && 
                        lyrics.length > 50) {
                      
                      // 检查是否已存在相同歌词
                      const isDuplicate = results.some(result => 
                        result.platform === 'netease' && 
                        result.lyrics === lyrics
                      );
                      
                      if (!isDuplicate) {
                        results.push({
                          platform: 'netease',
                          platformName: '网易云音乐 (落月API)',
                          song: song.song || song.name || songName,
                          artist: song.singer || song.artist || artist || '未知艺术家',
                          lyrics: lyrics,
                          duration: song.interval || '未知时长',
                          quality: song.quality || 0
                        });
                        
                        console.log('网易云歌词添加成功:', song.song || song.name);
                      }
                    }
                    
                    // 如果有逐字歌词(yrc)，也添加进来
                    if (lyricsData.data.yrc && lyricsData.data.yrc.trim()) {
                      let yrcLyrics = lyricsData.data.yrc;
                      
                      // 简单处理yrc格式，转换为标准LRC格式
                      yrcLyrics = this.convertYrcToLrc(yrcLyrics);
                      
                      if (yrcLyrics && yrcLyrics !== lyrics) {
                        const isDuplicateYrc = results.some(result => 
                          result.platform === 'netease' && 
                          result.lyrics === yrcLyrics
                        );
                        
                        if (!isDuplicateYrc) {
                          results.push({
                            platform: 'netease',
                            platformName: '网易云音乐 (逐字歌词)',
                            song: song.song || song.name || songName,
                            artist: song.singer || song.artist || artist || '未知艺术家',
                            lyrics: yrcLyrics,
                            duration: song.interval || '未知时长',
                            quality: (song.quality || 0) + 1,
                            type: 'yrc'
                          });
                          
                          console.log('网易云逐字歌词添加成功:', song.song || song.name);
                        }
                      }
                    }
                  } else {
                    console.warn('歌词API返回无效数据:', lyricsData);
                  }
                } else {
                  console.warn('歌词API请求失败，状态码:', lyricsResponse.status);
                }
              } catch (lyricError) {
                console.warn(`获取网易云歌曲歌词失败:`, lyricError);
              }
              
              // 添加小延迟避免请求过快
              if (i % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
          } else {
            console.warn('搜索API返回无效数据:', searchData);
          }
        } else {
          console.warn('搜索API请求失败，状态码:', searchResponse.status);
        }
      } catch (error) {
        console.warn('网易云音乐API失败:', error);
      }
    }
    */
    
    // QQ音乐API - 新增支持
    if (platforms.includes('qq')) {
      try {
        console.log('开始搜索QQ音乐歌词:', searchKeyword);
        
        // QQ音乐搜索API
        const searchUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?ct=24&qqmusic_ver=1298&new_json=1&remoteplace=txt.yqq.center&searchid=${Date.now()}&t=0&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&p=1&n=20&w=${encodeURIComponent(searchKeyword)}&g_tk=5381&jsonpCallback=searchCallbacksong${Date.now()}&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0`;
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://y.qq.com/'
          }
        });
        
        if (searchResponse.ok) {
          let responseText = await searchResponse.text();
          
          // 处理JSONP响应
          try {
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
              const searchData = JSON.parse(jsonStr);
              
              if (searchData.data && searchData.data.song && searchData.data.song.list) {
                console.log('QQ音乐搜索结果数量:', searchData.data.song.list.length);
                
                // 取前10首歌曲的歌词
                for (let i = 0; i < Math.min(10, searchData.data.song.list.length); i++) {
                  const song = searchData.data.song.list[i];
                  
                  try {
                    // 获取歌词
                    const lyricsUrl = `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?callback=MusicJsonCallback_lrc&pcachetime=${Date.now()}&songmid=${song.mid}&g_tk=5381&jsonpCallback=MusicJsonCallback_lrc&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0`;
                    
                    const lyricsResponse = await fetch(lyricsUrl, {
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://y.qq.com/'
                      }
                    });
                    
                    if (lyricsResponse.ok) {
                      let lyricsText = await lyricsResponse.text();
                      
                      // 处理JSONP响应
                      try {
                        const lyricsJsonStart = lyricsText.indexOf('{');
                        const lyricsJsonEnd = lyricsText.lastIndexOf('}');
                        
                        if (lyricsJsonStart !== -1 && lyricsJsonEnd !== -1) {
                          const lyricsJsonStr = lyricsText.substring(lyricsJsonStart, lyricsJsonEnd + 1);
                          const lyricsData = JSON.parse(lyricsJsonStr);
                          
                          if (lyricsData.lyric) {
                            // Base64解码歌词
                            const decodedLyrics = atob(lyricsData.lyric);
                            
                            if (decodedLyrics && decodedLyrics.trim() && 
                                !decodedLyrics.includes('作词') && 
                                !decodedLyrics.includes('作曲') && 
                                decodedLyrics.length > 50) {
                              
                              // 检查是否已存在相同歌词
                              const isDuplicate = results.some(result => 
                                result.platform === 'qq' && 
                                result.lyrics === decodedLyrics
                              );
                              
                              if (!isDuplicate) {
                                results.push({
                                  platform: 'qq',
                                  platformName: 'QQ音乐',
                                  song: song.name,
                                  artist: song.singer?.map(s => s.name).join('/') || artist || '未知艺术家',
                                  lyrics: decodedLyrics,
                                  duration: this.formatDuration(song.interval * 1000),
                                  quality: song.pay?.payplay || 0
                                });
                                
                                console.log('QQ音乐歌词添加成功:', song.name);
                              }
                            }
                          }
                        }
                      } catch (lyricsParseError) {
                        console.warn('QQ音乐歌词解析失败:', lyricsParseError);
                      }
                    }
                  } catch (lyricError) {
                    console.warn(`获取QQ音乐歌曲歌词失败:`, lyricError);
                  }
                  
                  // 添加小延迟避免请求过快
                  if (i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                }
              }
            }
          } catch (parseError) {
            console.warn('QQ音乐搜索响应解析失败:', parseError);
          }
        }
      } catch (error) {
        console.warn('QQ音乐API失败:', error);
      }
    }
    
    // 酷我音乐API - 新增支持
    if (platforms.includes('kuwo')) {
      try {
        console.log('开始搜索酷我音乐歌词:', searchKeyword);
        
        // 酷我音乐搜索API
        const searchUrl = `https://www.kuwo.cn/api/www/search/searchMusicBykeyWord?key=${encodeURIComponent(searchKeyword)}&pn=1&rn=30&httpsStatus=1&reqId=${Date.now()}`;
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.kuwo.cn/',
            'csrf': Date.now().toString()
          }
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          if (searchData.data && searchData.data.list && searchData.data.list.length > 0) {
            console.log('酷我音乐搜索结果数量:', searchData.data.list.length);
            
            // 取前10首歌曲的歌词
            for (let i = 0; i < Math.min(10, searchData.data.list.length); i++) {
              const song = searchData.data.list[i];
              
              try {
                // 获取歌词
                const lyricsUrl = `https://www.kuwo.cn/api/v1/www/music/playInfo?mid=${song.rid}&type=music&httpsStatus=1&reqId=${Date.now()}`;
                
                const lyricsResponse = await fetch(lyricsUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.kuwo.cn/',
                    'csrf': Date.now().toString()
                  }
                });
                
                if (lyricsResponse.ok) {
                  const lyricsData = await lyricsResponse.json();
                  
                  if (lyricsData.data && lyricsData.data.lrclist) {
                    // 组合歌词
                    const lyricsLines = lyricsData.data.lrclist.map(item => 
                      `[${this.formatTime(item.time)}]${item.lineLyric}`
                    ).join('\n');
                    
                    if (lyricsLines && lyricsLines.trim() && 
                        !lyricsLines.includes('作词') && 
                        !lyricsLines.includes('作曲') && 
                        lyricsLines.length > 50) {
                      
                      // 检查是否已存在相同歌词
                      const isDuplicate = results.some(result => 
                        result.platform === 'kuwo' && 
                        result.lyrics === lyricsLines
                      );
                      
                      if (!isDuplicate) {
                        results.push({
                          platform: 'kuwo',
                          platformName: '酷我音乐',
                          song: song.name,
                          artist: song.artist || artist || '未知艺术家',
                          lyrics: lyricsLines,
                          duration: this.formatDuration(song.duration * 1000),
                          quality: song.score || 0
                        });
                        
                        console.log('酷我音乐歌词添加成功:', song.name);
                      }
                    }
                  }
                }
              } catch (lyricError) {
                console.warn(`获取酷我音乐歌曲歌词失败:`, lyricError);
              }
              
              // 添加小延迟避免请求过快
              if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }
        }
      } catch (error) {
        console.warn('酷我音乐API失败:', error);
      }
    }
    
    // 按质量评分排序结果
    results.sort((a, b) => (b.quality || 0) - (a.quality || 0));
    
    console.log(`歌词搜索完成，共找到 ${results.length} 个结果`);
    return results;
  }
  
  // 新增方法：合并歌词和翻译
  mergeLyricsWithTranslation(originalLyrics, translationLyrics) {
    if (!originalLyrics || !translationLyrics) return originalLyrics;
    
    try {
      const originalLines = originalLyrics.split('\n');
      const translationLines = translationLyrics.split('\n');
      
      const mergedLines = [];
      
      originalLines.forEach(originalLine => {
        if (originalLine.trim()) {
          mergedLines.push(originalLine);
          
          // 查找对应的翻译行
          const timeMatch = originalLine.match(/\[(\d{2}:\d{2}\.\d{2,3})\]/);
          if (timeMatch) {
            const timeTag = timeMatch[1];
            const translationLine = translationLines.find(line => line.includes(timeTag));
            if (translationLine) {
              const translationText = translationLine.replace(/\[.*?\]/, '').trim();
              if (translationText) {
                mergedLines.push(`[${timeTag}]${translationText}`);
              }
            }
          }
        }
      });
      
      return mergedLines.join('\n');
    } catch (error) {
      console.warn('合并歌词翻译失败:', error);
      return originalLyrics;
    }
  }
  
  // 新增方法：格式化时间
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(2);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.padStart(5, '0')}`;
  }

  // 辅助方法：备用URL请求
  async fetchWithFallback(urls) {
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn(`请求失败 ${url}:`, error);
      }
    }
    return null;
  }

  // 格式化时长
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  displaySearchResults(results) {
    const resultsList = this.modal.querySelector('#resultsList');
    
    if (results.length === 0) {
      resultsList.innerHTML = '<div class="no-results">未找到相关歌词</div>';
      return;
    }

    resultsList.innerHTML = results.map(result => `
      <div class="result-item" data-lyrics="${encodeURIComponent(result.lyrics)}">
        <div class="result-header">
          <span class="platform-badge">${result.platformName}</span>
          <span class="result-info">${result.song} - ${result.artist}</span>
          <span class="result-duration">${result.duration}</span>
        </div>
        <div class="result-preview">
          ${this.formatLyricsPreview(result.lyrics)}
        </div>
        <button class="use-lyrics-btn">使用此歌词</button>
      </div>
    `).join('');

    // 绑定使用歌词事件
    resultsList.querySelectorAll('.use-lyrics-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.result-item');
        const lyrics = decodeURIComponent(resultItem.dataset.lyrics);
        this.selectLyrics(lyrics);
      });
    });
  }

  formatLyricsPreview(lyrics) {
    const lines = lyrics.split('\n').slice(0, 3);
    return lines.map(line => {
      const match = line.match(/\[.*?\](.*)/);
      return match ? match[1] : line;
    }).join('<br>') + (lyrics.split('\n').length > 3 ? '<br>...' : '');
  }

  selectLyrics(lyrics) {
    this.currentLyrics = lyrics;
    this.showMessage('歌词已选择，保存设置后将应用到播放器', 'success');
  }

  saveSettings() {
    const fontSize = this.modal.querySelector('#fontSizeRange').value;
    const fontColor = this.modal.querySelector('#fontColorPicker').value;
    const backgroundColor = this.modal.querySelector('#backgroundColorPicker').value;
    const backgroundOpacity = this.modal.querySelector('#backgroundOpacity').value;
    const fontFamily = this.modal.querySelector('#fontFamilySelect').value;
    const lineHeight = this.modal.querySelector('#lineHeightRange').value;
    const showTranslation = this.modal.querySelector('#showTranslation').checked;

    const bgRgb = this.hexToRgb(backgroundColor);
    const bgColor = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${backgroundOpacity / 100})`;

    this.lyricsSettings = {
      fontSize: parseInt(fontSize),
      color: fontColor,
      backgroundColor: bgColor,
      fontFamily: fontFamily,
      lineHeight: parseFloat(lineHeight),
      showTranslation: showTranslation
    };

    this.settings.set('lyricsSettings', this.lyricsSettings);
    
    if (this.currentLyrics) {
      this.settings.set('currentLyrics', this.currentLyrics);
    }

    // 触发歌词样式更新事件
    window.dispatchEvent(new CustomEvent('lyricsSettingsUpdate', {
      detail: {
        settings: this.lyricsSettings,
        lyrics: this.currentLyrics
      }
    }));

    this.showMessage('设置已保存', 'success');
    
    // 延迟关闭窗口，让用户看到成功提示
    setTimeout(() => {
      this.close();
    }, 1000);
  }

  open(songInfo = null) {
    if (songInfo) {
      this.modal.querySelector('#songNameInput').value = songInfo.title || '';
      this.modal.querySelector('#artistInput').value = songInfo.artist || '';
    }
    
    this.modal.style.display = 'flex';
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.modal.style.display = 'none';
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  getCurrentSettings() {
    return this.lyricsSettings;
  }

  getCurrentLyrics() {
    return this.settings.get('currentLyrics', '');
  }

  // 手动输入歌词相关事件
  useManualLyrics() {
    const songName = this.modal.querySelector('#manualSongName').value.trim();
    const artist = this.modal.querySelector('#manualArtist').value.trim();
    const lyricsContent = this.modal.querySelector('#manualLyricsInput').value.trim();

    if (!lyricsContent) {
      this.showMessage('请输入歌词内容', 'error');
      return;
    }

    // 如果歌词没有时间轴，自动添加简单的时间轴
    let processedLyrics = lyricsContent;
    if (!lyricsContent.includes('[') || !lyricsContent.includes(']')) {
      const lines = lyricsContent.split('\n').filter(line => line.trim());
      processedLyrics = lines.map((line, index) => {
        const timeMinutes = Math.floor(index * 5 / 60);
        const timeSeconds = (index * 5) % 60;
        const timeString = `${timeMinutes.toString().padStart(2, '0')}:${timeSeconds.toString().padStart(2, '0')}.00`;
        return `[${timeString}]${line}`;
      }).join('\n');
    }

    // 添加歌曲信息到歌词开头
    if (songName) {
      const titleLine = `[ti:${songName}]`;
      const artistLine = artist ? `[ar:${artist}]` : '';
      processedLyrics = `${titleLine}\n${artistLine}\n${processedLyrics}`;
    }

    this.currentLyrics = processedLyrics;
    this.showMessage('歌词已设置成功！', 'success');
  }

  clearManualLyrics() {
    this.modal.querySelector('#manualSongName').value = '';
    this.modal.querySelector('#manualArtist').value = '';
    this.modal.querySelector('#manualLyricsInput').value = '';
  }

  // 新增方法：将yrc格式转换为标准LRC格式
  convertYrcToLrc(yrcLyrics) {
    if (!yrcLyrics) return '';
    
    try {
      const lines = yrcLyrics.split('\n');
      const lrcLines = [];
      
      lines.forEach(line => {
        if (!line.trim()) return;
        
        // 处理JSON格式的yrc行 {"t":12420,"c":[{"tx":"ya "},{"tx":"la "}]}
        if (line.startsWith('{') && line.includes('"t":') && line.includes('"c":')) {
          try {
            const yrcLine = JSON.parse(line);
            if (yrcLine.t && yrcLine.c && Array.isArray(yrcLine.c)) {
              const timeMs = yrcLine.t;
              const text = yrcLine.c.map(item => item.tx || '').join('');
              
              if (text.trim()) {
                // 转换时间戳为LRC格式时间标签
                const minutes = Math.floor(timeMs / 60000);
                const seconds = Math.floor((timeMs % 60000) / 1000);
                const milliseconds = timeMs % 1000;
                const timeTag = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${Math.floor(milliseconds / 10).toString().padStart(2, '0')}`;
                
                lrcLines.push(`[${timeTag}]${text.trim()}`);
              }
            }
          } catch (parseError) {
            console.warn('解析yrc JSON行失败:', parseError, line);
          }
        }
        // 处理带有特殊格式的时间轴行 [12420,3470](12420,290,0)ya (12710,380,0)la
        else if (line.includes('[') && line.includes(']') && line.includes('(') && line.includes(')')) {
          try {
            // 提取时间和文本
            const timeMatch = line.match(/^\[(\d+),\d+\]/);
            if (timeMatch) {
              const timeMs = parseInt(timeMatch[1]);
              
              // 提取文本内容，移除时间标记
              let text = line.replace(/^\[\d+,\d+\]/, '').replace(/\(\d+,\d+,\d+\)/g, '');
              text = text.trim();
              
              if (text) {
                // 转换时间戳为LRC格式时间标签
                const minutes = Math.floor(timeMs / 60000);
                const seconds = Math.floor((timeMs % 60000) / 1000);
                const milliseconds = timeMs % 1000;
                const timeTag = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${Math.floor(milliseconds / 10).toString().padStart(2, '0')}`;
                
                lrcLines.push(`[${timeTag}]${text}`);
              }
            }
          } catch (parseError) {
            console.warn('解析yrc特殊格式行失败:', parseError, line);
          }
        }
        // 如果已经是标准LRC格式，直接添加
        else if (line.match(/^\[\d{2}:\d{2}\.\d{2,3}\]/)) {
          lrcLines.push(line);
        }
        // 如果是其他格式，尝试作为纯文本处理
        else if (line.trim() && !line.includes('作词') && !line.includes('作曲')) {
          // 为纯文本添加默认时间轴
          const index = lrcLines.length;
          const timeMs = index * 3000; // 每行间隔3秒
          const minutes = Math.floor(timeMs / 60000);
          const seconds = Math.floor((timeMs % 60000) / 1000);
          const timeTag = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.00`;
          
          lrcLines.push(`[${timeTag}]${line.trim()}`);
        }
      });
      
      console.log('yrc转LRC完成，转换行数:', lrcLines.length);
      return lrcLines.join('\n');
    } catch (error) {
      console.warn('yrc格式转换失败:', error);
      return yrcLyrics; // 转换失败时返回原文本
    }
  }
} 