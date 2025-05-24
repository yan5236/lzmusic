// 歌单组件
class Playlist {
  constructor(player) {
    this.player = player;
    this.playlistManager = new PlaylistManager();
    
    this.playlistGrid = document.getElementById('playlistGrid');
    this.createPlaylistBtn = document.querySelector('.create-playlist-btn');
    
    this.currentPlaylist = null;
    this.isEditing = false;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadPlaylists();
  }

  bindEvents() {
    // 创建歌单按钮
    this.createPlaylistBtn.addEventListener('click', () => {
      this.showCreatePlaylistDialog();
    });

    // 监听添加到歌单事件
    document.addEventListener('addToPlaylist', (e) => {
      this.showAddToPlaylistDialog(e.detail.video);
    });
  }

  // 加载歌单列表
  loadPlaylists() {
    const playlists = this.playlistManager.getAll();
    this.renderPlaylistGrid(playlists);
  }

  // 渲染歌单网格
  renderPlaylistGrid(playlists) {
    this.playlistGrid.innerHTML = '';

    if (playlists.length === 0) {
      this.showEmptyState();
      return;
    }

    const fragment = document.createDocumentFragment();

    playlists.forEach(playlist => {
      const item = this.createPlaylistItem(playlist);
      fragment.appendChild(item);
    });

    this.playlistGrid.appendChild(fragment);
  }

  // 创建歌单项
  createPlaylistItem(playlist) {
    const item = document.createElement('div');
    item.className = 'playlist-card';
    item.dataset.playlistId = playlist.id;

    const coverImage = playlist.songs.length > 0 ? playlist.songs[0].cover : '';
    const songCount = playlist.songs.length;

    item.innerHTML = `
      <div class="playlist-card-cover">
        ${coverImage ? 
          `<img src="${coverImage}" alt="封面" loading="lazy">` :
          `<div class="playlist-cover-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>`
        }
        <div class="playlist-card-overlay">
          <button class="play-playlist-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="playlist-card-info">
        <h3 class="playlist-card-title" title="${playlist.name}">${playlist.name}</h3>
        <p class="playlist-card-count">${songCount} 首歌曲</p>
      </div>
      <div class="playlist-card-actions">
        <button class="action-btn edit-btn" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button class="action-btn delete-btn" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    `;

    this.bindPlaylistItemEvents(item, playlist);
    return item;
  }

  // 绑定歌单项事件
  bindPlaylistItemEvents(item, playlist) {
    const playBtn = item.querySelector('.play-playlist-btn');
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');

    // 双击打开歌单
    item.addEventListener('dblclick', () => {
      this.openPlaylist(playlist);
    });

    // 播放歌单
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playPlaylist(playlist);
    });

    // 编辑歌单
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editPlaylist(playlist);
    });

    // 删除歌单
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deletePlaylist(playlist);
    });

    // 点击打开歌单
    item.addEventListener('click', () => {
      this.openPlaylist(playlist);
    });
  }

  // 显示创建歌单对话框
  showCreatePlaylistDialog() {
    const dialog = this.createDialog('创建歌单', `
      <div class="dialog-body">
        <div class="form-group">
          <label for="playlistName">歌单名称</label>
          <input type="text" id="playlistName" placeholder="请输入歌单名称" maxlength="50">
        </div>
      </div>
    `, [
      {
        text: '取消',
        type: 'secondary',
        handler: (dialog) => dialog.close()
      },
      {
        text: '创建',
        type: 'primary',
        handler: (dialog) => {
          const name = dialog.querySelector('#playlistName').value.trim();
          if (name) {
            this.createPlaylist(name);
            dialog.close();
          }
        }
      }
    ]);

    // 自动聚焦输入框
    setTimeout(() => {
      const input = dialog.querySelector('#playlistName');
      if (input) {
        input.focus();
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const createBtn = dialog.querySelector('.dialog-btn-primary');
            createBtn.click();
          }
        });
      }
    }, 100);
  }

  // 显示添加到歌单对话框
  showAddToPlaylistDialog(video) {
    const playlists = this.playlistManager.getAll();
    
    if (playlists.length === 0) {
      this.showCreatePlaylistDialog();
      return;
    }

    const playlistOptions = playlists.map(playlist => 
      `<div class="playlist-option" data-playlist-id="${playlist.id}">
        <div class="playlist-option-info">
          <span class="playlist-option-name">${playlist.name}</span>
          <span class="playlist-option-count">${playlist.songs.length} 首歌曲</span>
        </div>
      </div>`
    ).join('');

    const dialog = this.createDialog('添加到歌单', `
      <div class="dialog-body">
        <div class="song-preview">
          <img src="${video.cover}" alt="封面">
          <div class="song-preview-info">
            <div class="song-preview-title">${video.title}</div>
            <div class="song-preview-artist">${video.author}</div>
          </div>
        </div>
        <div class="playlist-options">
          ${playlistOptions}
        </div>
        <div class="form-group">
          <button type="button" class="create-new-playlist-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            创建新歌单
          </button>
        </div>
      </div>
    `, [
      {
        text: '取消',
        type: 'secondary',
        handler: (dialog) => dialog.close()
      },
      {
        text: '添加',
        type: 'primary',
        handler: (dialog) => {
          const selected = dialog.querySelector('.playlist-option.selected');
          if (selected) {
            const playlistId = selected.dataset.playlistId;
            this.addSongToPlaylist(playlistId, video);
            dialog.close();
          }
        }
      }
    ]);

    // 绑定选择事件
    const options = dialog.querySelectorAll('.playlist-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    // 创建新歌单按钮
    const createNewBtn = dialog.querySelector('.create-new-playlist-btn');
    createNewBtn.addEventListener('click', () => {
      dialog.close();
      this.showCreatePlaylistDialog();
    });
  }

  // 创建歌单
  createPlaylist(name) {
    const playlist = this.playlistManager.create(name);
    this.loadPlaylists();
    this.showToast(`成功创建歌单 "${name}"`);
  }

  // 播放歌单
  async playPlaylist(playlist) {
    if (playlist.songs.length === 0) {
      this.showToast('歌单为空');
      return;
    }

    try {
      await this.player.playSong(playlist.songs[0], playlist.songs, 0);
      this.showToast(`正在播放歌单 "${playlist.name}"`);
    } catch (error) {
      console.error('播放歌单失败:', error);
      this.showToast('播放失败');
    }
  }

  // 编辑歌单
  editPlaylist(playlist) {
    const dialog = this.createDialog('编辑歌单', `
      <div class="dialog-body">
        <div class="form-group">
          <label for="editPlaylistName">歌单名称</label>
          <input type="text" id="editPlaylistName" value="${playlist.name}" maxlength="50">
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
          const name = dialog.querySelector('#editPlaylistName').value.trim();
          if (name && name !== playlist.name) {
            this.playlistManager.update(playlist.id, { name });
            this.loadPlaylists();
            this.showToast('歌单已更新');
          }
          dialog.close();
        }
      }
    ]);
  }

  // 删除歌单
  deletePlaylist(playlist) {
    const dialog = this.createDialog('删除歌单', `
      <div class="dialog-body">
        <p>确定要删除歌单 "${playlist.name}" 吗？</p>
        <p class="warning">此操作无法撤销。</p>
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
          this.playlistManager.delete(playlist.id);
          this.loadPlaylists();
          this.showToast(`已删除歌单 "${playlist.name}"`);
          dialog.close();
        }
      }
    ]);
  }

  // 打开歌单详情
  openPlaylist(playlist) {
    this.currentPlaylist = playlist;
    this.showPlaylistDetail(playlist);
  }

  // 显示歌单详情
  showPlaylistDetail(playlist) {
    const modal = document.createElement('div');
    modal.className = 'playlist-detail-modal';
    modal.innerHTML = `
      <div class="playlist-detail-content">
        <div class="playlist-detail-header">
          <button class="close-detail-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          <div class="playlist-detail-info">
            <h2>${playlist.name}</h2>
            <p>${playlist.songs.length} 首歌曲 · 创建于 ${this.formatDate(playlist.createTime)}</p>
          </div>
          <div class="playlist-detail-actions">
            <button class="play-all-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              播放全部
            </button>
          </div>
        </div>
        <div class="playlist-detail-songs">
          <div class="songs-list" id="playlistSongs">
            ${this.renderPlaylistSongs(playlist.songs)}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // 绑定事件
    this.bindPlaylistDetailEvents(modal, playlist);
    
    // 显示模态框
    setTimeout(() => modal.classList.add('show'), 10);
  }

  // 渲染歌单歌曲
  renderPlaylistSongs(songs) {
    if (songs.length === 0) {
      return `
        <div class="empty-playlist">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <h3>歌单还没有歌曲</h3>
          <p>去搜索页面添加一些歌曲吧</p>
        </div>
      `;
    }

    return songs.map((song, index) => `
      <div class="song-item" data-index="${index}" data-bvid="${song.bvid}">
        <div class="song-index">${index + 1}</div>
        <div class="song-cover">
          <img src="${song.cover}" alt="封面" loading="lazy">
        </div>
        <div class="song-info">
          <div class="song-title">${song.title}</div>
          <div class="song-artist">${song.author}</div>
        </div>
        <div class="song-duration">${song.duration}</div>
        <div class="song-actions">
          <button class="play-song-btn" title="播放">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <button class="remove-song-btn" title="从歌单中移除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  // 绑定歌单详情事件
  bindPlaylistDetailEvents(modal, playlist) {
    const closeBtn = modal.querySelector('.close-detail-btn');
    const playAllBtn = modal.querySelector('.play-all-btn');
    const songItems = modal.querySelectorAll('.song-item');

    // 关闭模态框
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    });

    // 播放全部
    playAllBtn.addEventListener('click', () => {
      this.playPlaylist(playlist);
    });

    // 歌曲项事件
    songItems.forEach((item, index) => {
      const playBtn = item.querySelector('.play-song-btn');
      const removeBtn = item.querySelector('.remove-song-btn');

      // 双击播放
      item.addEventListener('dblclick', () => {
        this.playSongFromPlaylist(playlist, index);
      });

      // 播放按钮
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playSongFromPlaylist(playlist, index);
      });

      // 移除按钮
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeSongFromPlaylist(playlist.id, playlist.songs[index].bvid);
        // 更新显示
        item.remove();
        playlist.songs.splice(index, 1);
      });
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeBtn.click();
      }
    });
  }

  // 从歌单播放歌曲
  async playSongFromPlaylist(playlist, index) {
    try {
      await this.player.playSong(playlist.songs[index], playlist.songs, index);
    } catch (error) {
      console.error('播放失败:', error);
      this.showToast('播放失败');
    }
  }

  // 添加歌曲到歌单
  addSongToPlaylist(playlistId, song) {
    const result = this.playlistManager.addSong(playlistId, song);
    if (result) {
      this.loadPlaylists();
      this.showToast('已添加到歌单');
    } else {
      this.showToast('歌曲已存在于歌单中');
    }
  }

  // 从歌单移除歌曲
  removeSongFromPlaylist(playlistId, bvid) {
    this.playlistManager.removeSong(playlistId, bvid);
    this.loadPlaylists();
    this.showToast('已从歌单中移除');
  }

  // 显示空状态
  showEmptyState() {
    this.playlistGrid.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <path d="M14 2v6h6"/>
          <path d="M16 13H8"/>
          <path d="M16 17H8"/>
          <path d="M10 9H8"/>
        </svg>
        <h3>还没有歌单</h3>
        <p>创建你的第一个歌单吧</p>
        <button class="create-first-playlist-btn">创建歌单</button>
      </div>
    `;

    const createBtn = this.playlistGrid.querySelector('.create-first-playlist-btn');
    createBtn.addEventListener('click', () => {
      this.showCreatePlaylistDialog();
    });
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
          <h3 class="dialog-title">${title}</h3>
        </div>
        ${content}
        <div class="dialog-actions">
          ${buttonsHtml}
        </div>
      </div>
    `;

    // 绑定按钮事件
    const dialogButtons = dialog.querySelectorAll('.dialog-btn');
    dialogButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        buttons[index].handler(dialog);
      });
    });

    // 点击背景关闭
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    // 添加到页面
    document.body.appendChild(dialog);
    
    // 添加关闭方法
    dialog.close = () => {
      dialog.classList.remove('show');
      setTimeout(() => dialog.remove(), 300);
    };
    
    // 显示对话框
    setTimeout(() => dialog.classList.add('show'), 10);
    
    return dialog;
  }

  // 显示提示消息
  showToast(message) {
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

  // 格式化日期
  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN');
  }
}

// 导出
window.Playlist = Playlist; 