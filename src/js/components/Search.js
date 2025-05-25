// 搜索组件
class Search {
  constructor(player, api) {
    this.player = player;
    this.api = api || new BilibiliAPI();
    
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.searchResults = document.getElementById('searchResults');
    
    this.currentKeyword = '';
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalResults = 0;
    this.isLoading = false;
    this.searchHistory = [];
    this.maxHistoryItems = 10;
    
    // 搜索建议相关
    this.suggestionsContainer = null;
    this.suggestions = [];
    this.suggestionsVisible = false;
    this.selectedSuggestionIndex = -1;
    
    // 热门搜索数据
    this.hotSearches = [];
    
    // 防抖定时器
    this.suggestionDebounceTimer = null;
    this.searchDebounceTimer = null;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSearchHistory();
    this.createSuggestionsContainer();
    this.loadHotSearches();
  }

  // 创建搜索建议容器
  createSuggestionsContainer() {
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'search-suggestions';
    this.suggestionsContainer.style.display = 'none';
    
    // 插入到搜索容器中，在搜索结果之前
    const searchContainer = document.querySelector('.search-container');
    const searchResults = document.getElementById('searchResults');
    searchContainer.insertBefore(this.suggestionsContainer, searchResults);
  }

  bindEvents() {
    // 搜索按钮点击
    this.searchBtn.addEventListener('click', () => {
      this.performSearch();
    });

    // 回车键搜索
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.hideSuggestions();
        this.performSearch();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateSuggestions(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateSuggestions(-1);
      } else if (e.key === 'Escape') {
        this.hideSuggestions();
      }
    });

    // 输入框变化
    this.searchInput.addEventListener('input', (e) => {
      this.handleInputChange(e.target.value);
    });

    // 输入框获得焦点
    this.searchInput.addEventListener('focus', () => {
      if (this.searchInput.value.trim()) {
        this.showSuggestions();
      } else {
        this.showHotSearches();
      }
    });

    // 输入框失去焦点
    this.searchInput.addEventListener('blur', () => {
      // 延迟隐藏，让点击建议有时间执行
      setTimeout(() => {
        this.hideSuggestions();
      }, 200);
    });

    // 搜索结果滚动加载更多
    this.searchResults.addEventListener('scroll', () => {
      this.handleScroll();
    });
  }

  // 执行搜索
  async performSearch() {
    const keyword = this.searchInput.value.trim();
    if (!keyword) return;

    // 清除防抖定时器，因为用户主动搜索
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    
    if (this.suggestionDebounceTimer) {
      clearTimeout(this.suggestionDebounceTimer);
      this.suggestionDebounceTimer = null;
    }

    this.currentKeyword = keyword;
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalResults = 0;
    
    // 添加到搜索历史
    this.addToHistory(keyword);
    
    // 隐藏搜索建议
    this.hideSuggestions();
    
    // 检查是否为 BV 号
    if (this.api.isBVID(keyword)) {
      await this.searchByBVID(keyword);
    } else {
      await this.searchVideos(keyword, 1);
    }
  }

  // 通过 BV 号搜索
  async searchByBVID(bvid) {
    try {
      this.showLoading();
      
      const videoInfo = await this.api.getVideoInfo(bvid);
      
      // 转换为搜索结果格式
      const result = {
        videos: [{
          bvid: videoInfo.bvid,
          title: videoInfo.title,
          author: videoInfo.author,
          cover: videoInfo.cover,
          duration: this.api.formatDuration(videoInfo.duration),
          cid: videoInfo.cid,
          pages: videoInfo.pages // 包含分P信息
        }],
        total: 1
      };
      
      this.displayResults(result, true);
      this.hideLoading();
      
    } catch (error) {
      console.error('BV号搜索失败:', error);
      this.showError('无法找到该BV号对应的视频');
      this.hideLoading();
    }
  }

  // 搜索视频
  async searchVideos(keyword, page = 1, isLoadMore = false) {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      
      if (page === 1 || !isLoadMore) {
        this.showLoading();
        // 显示搜索框加载状态
        this.showSearchLoading();
      } else {
        this.showLoadingMore();
      }
      
      const result = await this.api.searchVideos(keyword, page);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // 更新分页信息
      this.totalResults = result.total;
      this.totalPages = Math.min(50, Math.ceil(result.total / 20)); // B站最大50页
      
      // 获取视频详细信息（包含 cid）
      const detailedVideos = await Promise.all(
        result.videos.map(async (video) => {
          try {
            const videoInfo = await this.api.getVideoInfo(video.bvid);
            return {
              ...video,
              cid: videoInfo.cid,
              pages: videoInfo.pages // 包含分P信息
            };
          } catch (error) {
            console.error(`获取视频 ${video.bvid} 详细信息失败:`, error);
            return video; // 返回原始数据
          }
        })
      );

      result.videos = detailedVideos;
      
      // 页面跳转时替换内容，加载更多时追加内容
      const isNewSearch = page === 1 || !isLoadMore;
      this.displayResults(result, isNewSearch);
      
      if (page === 1 || !isLoadMore) {
        this.hideLoading();
        this.hideSearchLoading();
      } else {
        this.hideLoadingMore();
      }
      
    } catch (error) {
      console.error('搜索失败:', error);
      this.showError(error.message || '搜索失败，请稍后重试');
      
      if (page === 1 || !isLoadMore) {
        this.hideLoading();
        this.hideSearchLoading();
      } else {
        this.hideLoadingMore();
      }
    } finally {
      this.isLoading = false;
    }
  }

  // 显示搜索结果
  displayResults(result, isNewSearch = true) {
    if (isNewSearch) {
      this.searchResults.innerHTML = '';
    }

    if (!result.videos || result.videos.length === 0) {
      if (isNewSearch) {
        this.showEmptyState();
      }
      return;
    }

    const fragment = document.createDocumentFragment();
    
    result.videos.forEach(video => {
      const item = this.createSearchItem(video);
      fragment.appendChild(item);
    });

    // 如果是新搜索，插入到结果容器的开头（在分页控件之前）
    // 如果是加载更多，插入到分页控件之前
    const paginationControls = this.searchResults.querySelector('.pagination-controls');
    if (paginationControls && !isNewSearch) {
      // 加载更多：插入到分页控件之前
      this.searchResults.insertBefore(fragment, paginationControls);
    } else {
      // 新搜索：直接追加
      this.searchResults.appendChild(fragment);
    }
    
    // 显示总数信息和分页控制
    if (isNewSearch) {
      this.showResultInfo(this.totalResults);
      this.createPaginationControls();
    } else {
      this.updatePaginationControls();
    }
  }

  // 创建搜索结果项
  createSearchItem(video) {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.dataset.bvid = video.bvid;
    
    // 检查是否为分P视频
    const isMultiPart = video.pages && video.pages.length > 1;
    
    item.innerHTML = `
      <div class="search-item-cover">
        <img src="${video.cover}" alt="封面" loading="lazy">
        <div class="search-item-play">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <div class="search-item-info">
        <div class="search-item-title" title="${video.title}">${video.title}</div>
        <div class="search-item-artist" title="${video.author}">UP主: ${video.author}</div>
        ${isMultiPart ? `<div class="search-item-parts">共${video.pages.length}个分P</div>` : ''}
      </div>
      <div class="search-item-duration">${video.duration}</div>
      <div class="search-item-actions">
        ${isMultiPart ? `
          <button class="expand-parts-btn" title="展开分P">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
            </svg>
          </button>
        ` : ''}
        <button class="play-single-btn" title="播放">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <button class="add-to-playlist-btn" title="添加到歌单">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>
    `;

    // 如果是分P视频，添加分P列表容器
    if (isMultiPart) {
      const partsContainer = document.createElement('div');
      partsContainer.className = 'search-item-parts-list';
      partsContainer.style.display = 'none';
      partsContainer.innerHTML = this.createPartsListHTML(video);
      item.appendChild(partsContainer);
    }

    // 绑定事件
    this.bindSearchItemEvents(item, video);
    
    return item;
  }

  // 创建分P列表HTML
  createPartsListHTML(video) {
    return video.pages.map((page, index) => `
      <div class="part-item" data-index="${index}" data-cid="${page.cid}">
        <div class="part-info">
          <div class="part-title">P${index + 1}: ${page.part}</div>
          <div class="part-duration">${this.formatDuration(page.duration)}</div>
        </div>
        <div class="part-actions">
          <button class="play-part-btn" title="播放这一P">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <button class="add-part-btn" title="添加这一P到歌单">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  // 格式化时长
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // 绑定搜索项事件
  bindSearchItemEvents(item, video) {
    const playBtn = item.querySelector('.play-single-btn');
    const addBtn = item.querySelector('.add-to-playlist-btn');
    const expandBtn = item.querySelector('.expand-parts-btn');
    
    // 双击播放
    item.addEventListener('dblclick', (e) => {
      // 如果双击的是分P列表区域，不触发播放
      if (e.target.closest('.search-item-parts-list')) return;
      this.playVideo(video);
    });
    
    // 点击播放按钮
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playVideo(video);
    });
    
    // 添加到歌单
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.addToPlaylist(video);
    });

    // 展开分P列表
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePartsExpansion(item);
      });
    }

    // 绑定分P列表事件
    const partsContainer = item.querySelector('.search-item-parts-list');
    if (partsContainer) {
      this.bindPartsListEvents(partsContainer, video);
    }
    
    // 悬停效果
    item.addEventListener('mouseenter', () => {
      const playIcon = item.querySelector('.search-item-play');
      if (playIcon) {
        playIcon.style.opacity = '1';
      }
    });
    
    item.addEventListener('mouseleave', () => {
      const playIcon = item.querySelector('.search-item-play');
      if (playIcon) {
        playIcon.style.opacity = '0';
      }
    });
  }

  // 切换分P展开状态
  togglePartsExpansion(item) {
    const partsContainer = item.querySelector('.search-item-parts-list');
    const expandBtn = item.querySelector('.expand-parts-btn');
    
    if (partsContainer.style.display === 'none') {
      // 展开
      partsContainer.style.display = 'block';
      expandBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
        </svg>
      `;
      expandBtn.title = '收起分P';
    } else {
      // 收起
      partsContainer.style.display = 'none';
      expandBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
        </svg>
      `;
      expandBtn.title = '展开分P';
    }
  }

  // 绑定分P列表事件
  bindPartsListEvents(partsContainer, video) {
    const partItems = partsContainer.querySelectorAll('.part-item');
    
    partItems.forEach((partItem, index) => {
      const playPartBtn = partItem.querySelector('.play-part-btn');
      const addPartBtn = partItem.querySelector('.add-part-btn');
      
      // 播放特定分P
      playPartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playSpecificPart(video, index);
      });
      
      // 添加特定分P到歌单
      addPartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addSpecificPartToPlaylist(video, index);
      });
      
      // 双击播放分P
      partItem.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.playSpecificPart(video, index);
      });
    });
  }

  // 播放特定分P
  async playSpecificPart(video, partIndex) {
    try {
      const page = video.pages[partIndex];
      
      // 创建独立的分P歌曲对象
      const partSong = {
        ...video,
        title: `${this.getOriginalTitle(video.title)} (P${partIndex + 1}: ${page.part})`,
        cid: page.cid,
        pageInfo: {
          index: partIndex,
          part: page.part,
          duration: page.duration
        }
      };
      
      // 如果已经有试听歌单，将歌曲添加到歌单并播放
      if (this.player.isListenPlaylist && this.player.playlist.length > 0) {
        const songIndex = this.player.addToListenPlaylist(partSong);
        await this.player.playSong(partSong, this.player.playlist, songIndex);
      } else {
        // 创建新的试听歌单
        this.player.createListenPlaylist(partSong);
        await this.player.playSong(partSong, [partSong], 0);
      }
      
    } catch (error) {
      console.error('播放分P失败:', error);
      this.showError('播放失败：' + error.message);
    }
  }

  // 添加特定分P到歌单
  addSpecificPartToPlaylist(video, partIndex) {
    const page = video.pages[partIndex];
    
    // 创建独立的分P歌曲对象
    const partSong = {
      ...video,
      title: `${this.getOriginalTitle(video.title)} (P${partIndex + 1}: ${page.part})`,
      cid: page.cid,
      pageInfo: {
        index: partIndex,
        part: page.part,
        duration: page.duration
      }
    };
    
    // 触发添加到歌单事件
    const event = new CustomEvent('addToPlaylist', {
      detail: { video: partSong }
    });
    document.dispatchEvent(event);
  }

  // 获取原始标题（去除之前添加的分P信息）
  getOriginalTitle(title) {
    // 移除之前可能添加的分P信息，如 " (P1: xxx)" 或 " (P2: yyy)"
    return title.replace(/\s*\(P\d+:.*?\)$/, '');
  }

  // 播放视频
  async playVideo(video) {
    try {
      // 如果已经有试听歌单，将歌曲添加到歌单并播放
      if (this.player.isListenPlaylist && this.player.playlist.length > 0) {
        const songIndex = this.player.addToListenPlaylist(video);
        await this.player.playSong(video, this.player.playlist, songIndex);
      } else {
        // 创建新的试听歌单
        this.player.createListenPlaylist(video);
        await this.player.playSong(video, [video], 0);
      }
      
    } catch (error) {
      console.error('播放失败:', error);
      this.showError('播放失败：' + error.message);
    }
  }

  // 添加到歌单
  addToPlaylist(video) {
    // 触发添加到歌单事件
    const event = new CustomEvent('addToPlaylist', {
      detail: { video }
    });
    document.dispatchEvent(event);
  }

  // 在结果中查找视频
  findVideoInResults(bvid) {
    const items = this.searchResults.querySelectorAll('.search-item');
    for (let item of items) {
      if (item.dataset.bvid === bvid) {
        // 这里需要从缓存或其他地方获取完整数据
        // 简化处理，实际应用中可以维护一个结果缓存
        return null;
      }
    }
    return null;
  }

  // 处理输入变化
  async handleInputChange(value) {
    const cleanValue = value.trim();
    
    // 清除之前的防抖定时器
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    if (this.suggestionDebounceTimer) {
      clearTimeout(this.suggestionDebounceTimer);
    }

    if (!cleanValue) {
      this.showHotSearches();
      this.clearResults(); // 清空搜索结果
      return;
    }

    // 检查是否为 BV 号，BV号不实时搜索
    if (this.api.isBVID(cleanValue)) {
      this.hideSuggestions();
      return;
    }

    // 实时搜索 - 设置较短的防抖时间
    this.searchDebounceTimer = setTimeout(async () => {
      if (cleanValue.length >= 2) { // 至少2个字符才开始实时搜索
        try {
          this.currentKeyword = cleanValue;
          this.currentPage = 1;
          await this.searchVideos(cleanValue, 1, false); // 实时搜索，替换内容
        } catch (error) {
          console.error('实时搜索失败:', error);
        }
      }
    }, 800); // 实时搜索防抖时间800ms

    // 搜索建议 - 设置更短的防抖时间
    this.suggestionDebounceTimer = setTimeout(async () => {
      try {
        const suggestions = await this.api.getSearchSuggestions(cleanValue);
        if (suggestions && suggestions.length > 0) {
          this.displaySuggestions(suggestions, 'suggestions');
        } else {
          this.hideSuggestions();
        }
      } catch (error) {
        console.error('获取搜索建议失败:', error);
      }
    }, 300); // 搜索建议防抖时间300ms
  }

  // 加载热门搜索
  async loadHotSearches() {
    try {
      const hotSearches = await this.api.getHotSearches();
      this.hotSearches = hotSearches;
    } catch (error) {
      console.error('获取热门搜索失败:', error);
      this.hotSearches = [];
    }
  }

  // 显示热门搜索
  showHotSearches() {
    if (!this.hotSearches || this.hotSearches.length === 0) {
      this.hideSuggestions();
      return;
    }
    
    this.displaySuggestions(this.hotSearches, 'hot');
  }

  // 显示搜索建议
  displaySuggestions(suggestions, type = 'suggestions') {
    if (!suggestions || suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }
    
    this.suggestions = suggestions;
    this.selectedSuggestionIndex = -1;
    
    const title = type === 'hot' ? '热门搜索' : '搜索建议';
    
    let html = `<div class="suggestions-header">${title}</div>`;
    html += '<div class="suggestions-list">';
    
    suggestions.forEach((item, index) => {
      const keyword = item.keyword || item.show_name;
      html += `
        <div class="suggestion-item" data-index="${index}" data-keyword="${keyword}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <span class="suggestion-text">${keyword}</span>
        </div>
      `;
    });
    
    html += '</div>';
    
    this.suggestionsContainer.innerHTML = html;
    this.bindSuggestionEvents();
    this.showSuggestions();
  }

  // 绑定建议项事件
  bindSuggestionEvents() {
    const items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const keyword = item.dataset.keyword;
        this.searchInput.value = keyword;
        this.hideSuggestions();
        this.performSearch();
      });
      
      item.addEventListener('mouseenter', () => {
        this.selectedSuggestionIndex = parseInt(item.dataset.index);
        this.updateSuggestionSelection();
      });
    });
  }

  // 导航搜索建议
  navigateSuggestions(direction) {
    if (!this.suggestionsVisible || this.suggestions.length === 0) {
      return;
    }
    
    this.selectedSuggestionIndex += direction;
    
    if (this.selectedSuggestionIndex < -1) {
      this.selectedSuggestionIndex = this.suggestions.length - 1;
    } else if (this.selectedSuggestionIndex >= this.suggestions.length) {
      this.selectedSuggestionIndex = -1;
    }
    
    this.updateSuggestionSelection();
    
    // 更新输入框内容
    if (this.selectedSuggestionIndex >= 0) {
      const keyword = this.suggestions[this.selectedSuggestionIndex].keyword || 
                     this.suggestions[this.selectedSuggestionIndex].show_name;
      this.searchInput.value = keyword;
    }
  }

  // 更新建议选中状态
  updateSuggestionSelection() {
    const items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      if (index === this.selectedSuggestionIndex) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // 显示建议
  showSuggestions() {
    this.suggestionsContainer.style.display = 'block';
    // 添加动画效果
    setTimeout(() => {
      this.suggestionsContainer.classList.add('show');
    }, 10);
    this.suggestionsVisible = true;
  }

  // 隐藏建议
  hideSuggestions() {
    this.suggestionsContainer.classList.remove('show');
    // 延迟隐藏，等待动画完成
    setTimeout(() => {
      this.suggestionsContainer.style.display = 'none';
    }, 200);
    this.suggestionsVisible = false;
    this.selectedSuggestionIndex = -1;
  }

  // 处理滚动事件（加载更多）
  handleScroll() {
    const { scrollTop, scrollHeight, clientHeight } = this.searchResults;
    
    if (scrollTop + clientHeight >= scrollHeight - 100 && !this.isLoading) {
      this.loadMore();
    }
  }

  // 加载更多结果
  async loadMore() {
    if (!this.currentKeyword || this.api.isBVID(this.currentKeyword) || this.currentPage >= this.totalPages) return;
    
    this.currentPage++;
    await this.searchVideos(this.currentKeyword, this.currentPage, true); // 明确标识为加载更多
  }

  // 添加到搜索历史
  addToHistory(keyword) {
    // 移除已存在的
    this.searchHistory = this.searchHistory.filter(item => item !== keyword);
    
    // 添加到开头
    this.searchHistory.unshift(keyword);
    
    // 限制数量
    if (this.searchHistory.length > this.maxHistoryItems) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
    }
    
    // 保存到本地存储
    localStorage.setItem('lzmusic_searchHistory', JSON.stringify(this.searchHistory));
  }

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = localStorage.getItem('lzmusic_searchHistory');
      if (history) {
        this.searchHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('加载搜索历史失败:', error);
      this.searchHistory = [];
    }
  }

  // 清空搜索结果
  clearResults() {
    this.searchResults.innerHTML = '';
  }

  // 显示加载状态
  showLoading() {
    this.searchResults.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>搜索中...</p>
      </div>
    `;
  }

  // 隐藏加载状态
  hideLoading() {
    const loading = this.searchResults.querySelector('.loading');
    if (loading) {
      loading.remove();
    }
  }

  // 显示错误信息
  showError(message) {
    this.searchResults.innerHTML = `
      <div class="error-message">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <p>${message}</p>
        <button onclick="window.app.searchComponent.clearResults()">重试</button>
      </div>
    `;
  }

  // 显示空状态
  showEmptyState() {
    this.searchResults.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <h3>未找到相关内容</h3>
        <p>试试其他关键词或检查拼写</p>
      </div>
    `;
  }

  // 显示结果信息
  showResultInfo(total) {
    const existing = this.searchResults.querySelector('.result-info');
    if (existing) {
      existing.remove();
    }

    const info = document.createElement('div');
    info.className = 'result-info';
    info.innerHTML = `找到 ${total} 个相关结果`;
    info.style.cssText = `
      padding: 12px 16px;
      background: var(--background-secondary);
      border-bottom: 1px solid var(--border-color);
      font-size: 14px;
      color: var(--text-secondary);
    `;

    this.searchResults.insertBefore(info, this.searchResults.firstChild);
  }

  // 获取搜索历史
  getSearchHistory() {
    return this.searchHistory;
  }

  // 清空搜索历史
  clearSearchHistory() {
    this.searchHistory = [];
    localStorage.removeItem('lzmusic_searchHistory');
  }

  // 显示搜索框加载状态
  showSearchLoading() {
    const searchBox = this.searchInput.closest('.search-box');
    searchBox.classList.add('loading');
  }

  // 隐藏搜索框加载状态
  hideSearchLoading() {
    const searchBox = this.searchInput.closest('.search-box');
    searchBox.classList.remove('loading');
  }

  // 创建分页控制器
  createPaginationControls() {
    // 移除已存在的分页控制器
    const existingPagination = this.searchResults.querySelector('.pagination-controls');
    if (existingPagination) {
      existingPagination.remove();
    }

    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    paginationControls.innerHTML = `
      <div class="pagination-info">
        第 ${this.currentPage} 页，共 ${this.totalPages} 页 (${this.totalResults} 个结果)
      </div>
      <div class="pagination-buttons">
        <button class="pagination-btn prev-btn" ${this.currentPage <= 1 ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
          上一页
        </button>
        <button class="pagination-btn load-more-btn" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>
          加载更多 (${Math.min(20, Math.max(0, this.totalResults - this.currentPage * 20))} 个)
        </button>
        <button class="pagination-btn next-btn" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>
          下一页
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>
    `;

    // 添加样式
    paginationControls.style.cssText = `
      padding: 20px;
      background: var(--background-secondary);
      border-top: 1px solid var(--border-color);
      text-align: center;
      margin-top: 20px;
    `;

    // 绑定事件
    this.bindPaginationEvents(paginationControls);

    this.searchResults.appendChild(paginationControls);
  }

  // 更新分页控制器
  updatePaginationControls() {
    const paginationControls = this.searchResults.querySelector('.pagination-controls');
    if (!paginationControls) {
      this.createPaginationControls();
      return;
    }

    const paginationInfo = paginationControls.querySelector('.pagination-info');
    const prevBtn = paginationControls.querySelector('.prev-btn');
    const nextBtn = paginationControls.querySelector('.next-btn');
    const loadMoreBtn = paginationControls.querySelector('.load-more-btn');

    paginationInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页 (${this.totalResults} 个结果)`;
    
    prevBtn.disabled = this.currentPage <= 1;
    nextBtn.disabled = this.currentPage >= this.totalPages;
    loadMoreBtn.disabled = this.currentPage >= this.totalPages;
    
    const remainingResults = this.totalResults - this.currentPage * 20;
    if (remainingResults > 0) {
      loadMoreBtn.textContent = `加载更多 (${Math.min(20, remainingResults)} 个)`;
    } else {
      loadMoreBtn.textContent = '已加载全部';
    }
  }

  // 绑定分页事件
  bindPaginationEvents(paginationControls) {
    const prevBtn = paginationControls.querySelector('.prev-btn');
    const nextBtn = paginationControls.querySelector('.next-btn');
    const loadMoreBtn = paginationControls.querySelector('.load-more-btn');

    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.goToPage(this.currentPage - 1);
      }
    });

    nextBtn.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.goToPage(this.currentPage + 1);
      }
    });

    loadMoreBtn.addEventListener('click', () => {
      this.loadMore();
    });
  }

  // 跳转到指定页面
  async goToPage(page) {
    if (page < 1 || page > this.totalPages || this.isLoading) return;
    
    this.currentPage = page;
    
    // 滚动到顶部
    this.searchResults.scrollTop = 0;
    
    await this.searchVideos(this.currentKeyword, page, false); // 页面跳转，不是加载更多
  }

  // 显示加载更多状态
  showLoadingMore() {
    const paginationControls = this.searchResults.querySelector('.pagination-controls');
    if (paginationControls) {
      const loadMoreBtn = paginationControls.querySelector('.load-more-btn');
      if (loadMoreBtn) {
        loadMoreBtn.innerHTML = `
          <div class="loading-spinner small"></div>
          加载中...
        `;
        loadMoreBtn.disabled = true;
      }
    }
  }

  // 隐藏加载更多状态
  hideLoadingMore() {
    const paginationControls = this.searchResults.querySelector('.pagination-controls');
    if (paginationControls) {
      this.updatePaginationControls();
    }
  }
}

// 导出
window.Search = Search; 