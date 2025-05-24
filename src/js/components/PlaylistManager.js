// 歌单管理页面组件
class PlaylistManagementPage {
  constructor(player, playlistComponent) {
    this.player = player;
    this.playlistComponent = playlistComponent;
    this.playlistStorage = new PlaylistManager();
    
    this.currentPlaylist = null;
    this.selectedSongs = new Set();
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadPlaylists();
  }

  bindEvents() {
    // 歌单选择器
    const playlistSelect = document.getElementById('playlistSelect');
    playlistSelect.addEventListener('change', (e) => {
      this.selectPlaylist(e.target.value);
    });

    // 头部操作按钮
    const addSongsBtn = document.getElementById('addSongsBtn');
    const editInfoBtn = document.getElementById('editInfoBtn');
    const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');

    addSongsBtn.addEventListener('click', () => this.showAddSongsDialog());
    editInfoBtn.addEventListener('click', () => this.showEditPlaylistDialog());
    deletePlaylistBtn.addEventListener('click', () => this.showDeletePlaylistDialog());

    // 工具栏按钮
    const selectAllBtn = document.getElementById('selectAllBtn');
    const selectNoneBtn = document.getElementById('selectNoneBtn');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const exportBtn = document.getElementById('exportBtn');

    selectAllBtn.addEventListener('click', () => this.selectAllSongs());
    selectNoneBtn.addEventListener('click', () => this.selectNoneSongs());
    batchDeleteBtn.addEventListener('click', () => this.batchDeleteSongs());
    exportBtn.addEventListener('click', () => this.exportPlaylist());

    // 监听页面切换事件
    document.addEventListener('pageChanged', (e) => {
      if (e.detail.page === 'playlist-management') {
        this.onPageShow();
      }
    });
  }

  // 页面显示时刷新数据
  onPageShow() {
    this.loadPlaylists();
    if (this.currentPlaylist) {
      this.refreshCurrentPlaylist();
    }
  }

  // 加载歌单列表到选择器
  loadPlaylists() {
    const playlists = this.playlistStorage.getAll();
    const playlistSelect = document.getElementById('playlistSelect');
    
    // 清空选项
    playlistSelect.innerHTML = '<option value="">请选择歌单</option>';
    
    // 添加歌单选项
    playlists.forEach(playlist => {
      const option = document.createElement('option');
      option.value = playlist.id;
      option.textContent = `${playlist.name} (${playlist.songs.length}首)`;
      playlistSelect.appendChild(option);
    });

    // 如果当前有选中的歌单，保持选中状态
    if (this.currentPlaylist) {
      playlistSelect.value = this.currentPlaylist.id;
    }
  }

  // 选择歌单
  selectPlaylist(playlistId) {
    if (!playlistId) {
      this.currentPlaylist = null;
      this.updatePlaylistInfo();
      this.renderSongsList([]);
      this.updateActionButtons();
      return;
    }

    this.currentPlaylist = this.playlistStorage.get(playlistId);
    if (this.currentPlaylist) {
      this.updatePlaylistInfo();
      this.renderSongsList(this.currentPlaylist.songs);
      this.updateActionButtons();
    }
  }

  // 刷新当前歌单数据
  refreshCurrentPlaylist() {
    if (this.currentPlaylist) {
      const updatedPlaylist = this.playlistStorage.get(this.currentPlaylist.id);
      if (updatedPlaylist) {
        this.currentPlaylist = updatedPlaylist;
        this.updatePlaylistInfo();
        this.renderSongsList(this.currentPlaylist.songs);
      } else {
        // 歌单被删除了
        this.currentPlaylist = null;
        this.updatePlaylistInfo();
        this.renderSongsList([]);
        this.loadPlaylists(); // 刷新选择器
      }
    }
  }

  // 更新歌单信息显示
  updatePlaylistInfo() {
    const nameEl = document.getElementById('selectedPlaylistName');
    const countEl = document.getElementById('selectedPlaylistCount');

    if (this.currentPlaylist) {
      nameEl.textContent = this.currentPlaylist.name;
      countEl.textContent = `${this.currentPlaylist.songs.length} 首歌曲`;
    } else {
      nameEl.textContent = '未选择歌单';
      countEl.textContent = '0 首歌曲';
    }
  }

  // 更新操作按钮状态
  updateActionButtons() {
    const hasPlaylist = !!this.currentPlaylist;
    
    document.getElementById('addSongsBtn').disabled = !hasPlaylist;
    document.getElementById('editInfoBtn').disabled = !hasPlaylist;
    document.getElementById('deletePlaylistBtn').disabled = !hasPlaylist;
    document.getElementById('exportBtn').disabled = !hasPlaylist;
  }

  // 渲染歌曲列表
  renderSongsList(songs) {
    const container = document.getElementById('managementSongsList');
    
    if (songs.length === 0) {
      container.innerHTML = `
        <div class="empty-management">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <h3>${this.currentPlaylist ? '歌单为空' : '请选择一个歌单进行管理'}</h3>
          <p>${this.currentPlaylist ? '点击"添加歌曲"按钮来添加歌曲到这个歌单' : '从上方的下拉菜单中选择要管理的歌单'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="songs-list-container">
        ${songs.map((song, index) => this.renderSongItem(song, index)).join('')}
      </div>
    `;

    this.bindSongItemEvents();
    this.selectedSongs.clear();
    this.updateSelectionState();
  }

  // 渲染单个歌曲项
  renderSongItem(song, index) {
    return `
      <div class="management-song-item" data-index="${index}" data-bvid="${song.bvid}">
        <div class="song-checkbox">
          <input type="checkbox" class="song-select" id="song-${index}">
          <label for="song-${index}"></label>
        </div>
        <div class="song-order">${index + 1}</div>
        <div class="song-cover">
          <img src="${song.cover}" alt="封面" loading="lazy">
        </div>
        <div class="song-info">
          <div class="song-title" title="${song.title}">${song.title}</div>
          <div class="song-artist" title="${song.author}">${song.author}</div>
        </div>
        <div class="song-duration">${song.duration}</div>
        <div class="song-play-count">${song.play || 0} 播放</div>
        <div class="song-actions">
          <button class="action-btn play-btn" title="播放">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <button class="action-btn move-up-btn" title="上移" ${index === 0 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
            </svg>
          </button>
          <button class="action-btn move-down-btn" title="下移" ${index === this.currentPlaylist.songs.length - 1 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 8.84L12 13.42l4.59-4.58L18 10.25l-6 6-6-6z"/>
            </svg>
          </button>
          <button class="action-btn remove-btn" title="移除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // 绑定歌曲项事件
  bindSongItemEvents() {
    const songItems = document.querySelectorAll('.management-song-item');

    songItems.forEach((item, index) => {
      const checkbox = item.querySelector('.song-select');
      const playBtn = item.querySelector('.play-btn');
      const moveUpBtn = item.querySelector('.move-up-btn');
      const moveDownBtn = item.querySelector('.move-down-btn');
      const removeBtn = item.querySelector('.remove-btn');

      // 复选框事件
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedSongs.add(index);
        } else {
          this.selectedSongs.delete(index);
        }
        this.updateSelectionState();
      });

      // 播放歌曲
      playBtn.addEventListener('click', () => {
        this.playSongFromPlaylist(index);
      });

      // 上移歌曲
      if (moveUpBtn && !moveUpBtn.disabled) {
        moveUpBtn.addEventListener('click', () => {
          this.moveSong(index, index - 1);
        });
      }

      // 下移歌曲
      if (moveDownBtn && !moveDownBtn.disabled) {
        moveDownBtn.addEventListener('click', () => {
          this.moveSong(index, index + 1);
        });
      }

      // 移除歌曲
      removeBtn.addEventListener('click', () => {
        this.removeSongWithConfirm(index);
      });
    });
  }

  // 播放歌单中的歌曲
  async playSongFromPlaylist(index) {
    try {
      await this.player.playSong(this.currentPlaylist.songs[index], this.currentPlaylist.songs, index);
    } catch (error) {
      console.error('播放失败:', error);
      this.showToast('播放失败');
    }
  }

  // 移动歌曲位置
  moveSong(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= this.currentPlaylist.songs.length) return;

    const songs = this.currentPlaylist.songs;
    const temp = songs[fromIndex];
    songs[fromIndex] = songs[toIndex];
    songs[toIndex] = temp;

    this.playlistStorage.update(this.currentPlaylist.id, { songs });
    this.renderSongsList(songs);
    this.updatePlaylistInfo();
    this.showToast('歌曲位置已调整');
  }

  // 确认移除歌曲
  removeSongWithConfirm(index) {
    const song = this.currentPlaylist.songs[index];
    const dialog = this.createDialog('移除歌曲', `
      <div class="remove-song-confirm">
        <p>确定要从歌单中移除 "<strong>${song.title}</strong>" 吗？</p>
      </div>
    `, [
      {
        text: '取消',
        type: 'secondary',
        handler: (dialog) => dialog.close()
      },
      {
        text: '移除',
        type: 'danger',
        handler: (dialog) => {
          this.removeSong(index);
          dialog.close();
        }
      }
    ]);
  }

  // 移除歌曲
  removeSong(index) {
    this.currentPlaylist.songs.splice(index, 1);
    this.playlistStorage.update(this.currentPlaylist.id, { songs: this.currentPlaylist.songs });
    
    this.renderSongsList(this.currentPlaylist.songs);
    this.updatePlaylistInfo();
    this.loadPlaylists(); // 更新选择器中的歌曲数量
    this.showToast('歌曲已移除');
  }

  // 全选歌曲
  selectAllSongs() {
    const checkboxes = document.querySelectorAll('.song-select');
    checkboxes.forEach((cb, index) => {
      cb.checked = true;
      this.selectedSongs.add(index);
    });
    this.updateSelectionState();
  }

  // 取消选择
  selectNoneSongs() {
    const checkboxes = document.querySelectorAll('.song-select');
    checkboxes.forEach(cb => cb.checked = false);
    this.selectedSongs.clear();
    this.updateSelectionState();
  }

  // 更新选择状态
  updateSelectionState() {
    const selectedCount = this.selectedSongs.size;
    const selectedCountEl = document.getElementById('selectedCount');
    const selectedActionsBtn = document.getElementById('selectedActionsBtn');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');

    selectedCountEl.textContent = selectedCount;
    selectedActionsBtn.disabled = selectedCount === 0;
    batchDeleteBtn.disabled = selectedCount === 0;
  }

  // 批量删除歌曲
  batchDeleteSongs() {
    if (this.selectedSongs.size === 0) return;

    const dialog = this.createDialog('批量删除', `
      <div class="batch-delete-confirm">
        <p>确定要删除选中的 <strong>${this.selectedSongs.size}</strong> 首歌曲吗？</p>
      </div>
    `, [
      {
        text: '取消',
        type: 'secondary',
        handler: (dialog) => dialog.close()
      },
      {
        text: '删除',
        type: 'danger',
        handler: (dialog) => {
          const indices = Array.from(this.selectedSongs).sort((a, b) => b - a);
          indices.forEach(index => {
            this.currentPlaylist.songs.splice(index, 1);
          });

          this.playlistStorage.update(this.currentPlaylist.id, { songs: this.currentPlaylist.songs });
          this.renderSongsList(this.currentPlaylist.songs);
          this.updatePlaylistInfo();
          this.loadPlaylists();
          this.showToast(`已删除 ${indices.length} 首歌曲`);
          dialog.close();
        }
      }
    ]);
  }

  // 显示添加歌曲对话框
  showAddSongsDialog() {
    if (!this.currentPlaylist) return;

    const dialog = this.createDialog('添加歌曲到歌单', `
      <div class="add-songs-dialog">
        <div class="search-section">
          <div class="search-input-container">
            <input type="text" id="songSearchInput" placeholder="搜索歌曲..." class="search-input">
            <button id="searchSongsBtn" class="search-btn">搜索</button>
          </div>
        </div>
        <div class="search-results-section">
          <div id="songSearchResults" class="song-search-results">
            <div class="search-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <p>搜索歌曲添加到歌单</p>
            </div>
          </div>
        </div>
      </div>
    `, [
      {
        text: '关闭',
        type: 'secondary',
        handler: (dialog) => dialog.close()
      }
    ]);

    this.bindAddSongsDialogEvents(dialog);
  }

  // 绑定添加歌曲对话框事件
  bindAddSongsDialogEvents(dialog) {
    const searchInput = dialog.querySelector('#songSearchInput');
    const searchBtn = dialog.querySelector('#searchSongsBtn');
    const resultsContainer = dialog.querySelector('#songSearchResults');

    const search = async () => {
      const query = searchInput.value.trim();
      if (!query) return;

      try {
        searchBtn.textContent = '搜索中...';
        searchBtn.disabled = true;

        const results = await this.searchSongs(query);
        this.renderSearchResults(results, resultsContainer);

      } catch (error) {
        console.error('搜索失败:', error);
        this.showToast('搜索失败');
      } finally {
        searchBtn.textContent = '搜索';
        searchBtn.disabled = false;
      }
    };

    searchBtn.addEventListener('click', search);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        search();
      }
    });
  }

  // 搜索歌曲
  async searchSongs(query) {
    const searchComponent = window.app?.search;
    if (searchComponent) {
      return await searchComponent.searchVideos(query, 1, 20);
    }
    return [];
  }

  // 渲染搜索结果
  renderSearchResults(results, container) {
    if (!results || results.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <p>没有找到相关歌曲</p>
        </div>
      `;
      return;
    }

    container.innerHTML = results.map(video => `
      <div class="search-result-item" data-bvid="${video.bvid}">
        <div class="result-cover">
          <img src="${video.pic}" alt="封面" loading="lazy">
        </div>
        <div class="result-info">
          <div class="result-title">${video.title}</div>
          <div class="result-author">${video.owner.name}</div>
          <div class="result-stats">${this.formatPlayCount(video.stat.view)} 播放</div>
        </div>
        <div class="result-actions">
          <button class="add-to-playlist-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            添加
          </button>
        </div>
      </div>
    `).join('');

    const addBtns = container.querySelectorAll('.add-to-playlist-btn');
    addBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        this.addSongToPlaylist(results[index], btn);
      });
    });
  }

  // 添加歌曲到歌单
  addSongToPlaylist(video, btn) {
    const song = {
      bvid: video.bvid,
      title: video.title,
      author: video.owner.name,
      cover: video.pic,
      duration: this.formatDuration(video.duration),
      play: video.stat.view
    };

    const result = this.playlistStorage.addSong(this.currentPlaylist.id, song);
    if (result) {
      btn.textContent = '已添加';
      btn.disabled = true;
      this.showToast('歌曲已添加到歌单');
      
      this.currentPlaylist.songs.push(song);
      this.updatePlaylistInfo();
      this.loadPlaylists();
    } else {
      this.showToast('歌曲已存在于歌单中');
    }
  }

  // 显示编辑歌单信息对话框
  showEditPlaylistDialog() {
    if (!this.currentPlaylist) return;

    const dialog = this.createDialog('编辑歌单信息', `
      <div class="edit-playlist-dialog">
        <div class="form-group">
          <label for="editPlaylistName">歌单名称</label>
          <input type="text" id="editPlaylistName" value="${this.currentPlaylist.name}" maxlength="50">
        </div>
      </div>
    `, [
      {
        text: '取消',
        type: 'secondary',
        handler: (dialog) => dialog.close()
      },
      {
        text: '保存',
        type: 'primary',
        handler: (dialog) => {
          const newName = dialog.querySelector('#editPlaylistName').value.trim();
          if (newName && newName !== this.currentPlaylist.name) {
            this.updatePlaylistInfo({ name: newName });
          }
          dialog.close();
        }
      }
    ]);

    setTimeout(() => {
      const input = dialog.querySelector('#editPlaylistName');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  // 更新歌单信息
  updatePlaylistInfo(updates) {
    if (!this.currentPlaylist || !updates) return;

    Object.assign(this.currentPlaylist, updates);
    this.playlistStorage.update(this.currentPlaylist.id, updates);

    this.updatePlaylistInfo();
    this.loadPlaylists();

    if (this.playlistComponent) {
      this.playlistComponent.loadPlaylists();
    }

    this.showToast('歌单信息已更新');
  }

  // 显示删除歌单确认对话框
  showDeletePlaylistDialog() {
    if (!this.currentPlaylist) return;

    const dialog = this.createDialog('删除歌单', `
      <div class="delete-confirm-dialog">
        <div class="warning-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        <p>确定要删除歌单 "<strong>${this.currentPlaylist.name}</strong>" 吗？</p>
        <p class="warning-text">此操作不可恢复，歌单中的 ${this.currentPlaylist.songs.length} 首歌曲将被移除。</p>
      </div>
    `, [
      {
        text: '取消',
        type: 'secondary',
        handler: (dialog) => dialog.close()
      },
      {
        text: '删除',
        type: 'danger',
        handler: (dialog) => {
          this.deletePlaylist();
          dialog.close();
        }
      }
    ]);
  }

  // 删除歌单
  deletePlaylist() {
    const success = this.playlistStorage.delete(this.currentPlaylist.id);
    if (success) {
      this.showToast('歌单已删除');
      this.currentPlaylist = null;
      this.loadPlaylists();
      this.updatePlaylistInfo();
      this.renderSongsList([]);
      this.updateActionButtons();
      
      if (this.playlistComponent) {
        this.playlistComponent.loadPlaylists();
      }
    } else {
      this.showToast('删除失败');
    }
  }

  // 导出歌单
  exportPlaylist() {
    if (!this.currentPlaylist) return;

    try {
      const exportData = {
        name: this.currentPlaylist.name,
        createTime: this.currentPlaylist.createTime,
        songs: this.currentPlaylist.songs.map(song => ({
          title: song.title,
          author: song.author,
          bvid: song.bvid,
          duration: song.duration
        }))
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentPlaylist.name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('歌单已导出');
    } catch (error) {
      console.error('导出失败:', error);
      this.showToast('导出失败');
    }
  }

  // 创建对话框
  createDialog(title, content, buttons) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    
    const buttonsHtml = buttons.map(btn => 
      `<button class="dialog-btn dialog-btn-${btn.type}">${btn.text}</button>`
    ).join('');

    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>${title}</h3>
        </div>
        <div class="dialog-body">
          ${content}
        </div>
        <div class="dialog-footer">
          ${buttonsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const dialogBtns = dialog.querySelectorAll('.dialog-btn');
    dialogBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        buttons[index].handler({
          close: () => {
            dialog.classList.remove('show');
            setTimeout(() => dialog.remove(), 300);
          },
          querySelector: (selector) => dialog.querySelector(selector)
        });
      });
    });

    setTimeout(() => dialog.classList.add('show'), 10);

    return {
      close: () => {
        dialog.classList.remove('show');
        setTimeout(() => dialog.remove(), 300);
      },
      querySelector: (selector) => dialog.querySelector(selector)
    };
  }

  // 显示提示消息
  showToast(message) {
    if (this.playlistComponent && this.playlistComponent.showToast) {
      this.playlistComponent.showToast(message);
    } else {
      // 简单的提示实现
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        transition: all 0.3s ease;
        transform: translateX(100%);
      `;

      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.transform = 'translateX(0)';
      }, 10);

      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }

  // 格式化播放数
  formatPlayCount(count) {
    if (count > 10000) {
      return Math.floor(count / 10000) + '万';
    }
    return count.toString();
  }

  // 格式化时长
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// 导出类
window.PlaylistManagementPage = PlaylistManagementPage; 