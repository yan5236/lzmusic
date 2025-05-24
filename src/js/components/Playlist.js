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
        <button class="action-btn edit-playlist-text-btn" title="编辑歌单">
          编辑歌单
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
    const editBtn = item.querySelector('.edit-playlist-text-btn');
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
      this.showDeleteConfirmDialog(playlist);
    });

    // 点击打开歌单
    item.addEventListener('click', () => {
      this.openPlaylist(playlist);
    });
  }

  // 显示删除确认对话框
  showDeleteConfirmDialog(playlist) {
    const dialog = this.createDialog('删除歌单', `
      <div class="delete-confirm-dialog">
        <div class="warning-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        <p>确定要删除歌单 "<strong>${playlist.name}</strong>" 吗？</p>
        <p class="warning-text">此操作不可恢复，歌单中的 ${playlist.songs.length} 首歌曲将被移除。</p>
        <div class="delete-options">
          <label>
            <input type="checkbox" id="confirmDelete">
            我了解此操作不可恢复
          </label>
        </div>
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
          const confirmCheckbox = dialog.querySelector('#confirmDelete');
          if (confirmCheckbox.checked) {
            this.deletePlaylist(playlist);
            dialog.close();
          } else {
            this.showToast('请确认删除操作');
          }
        }
      }
    ]);
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
    const dialog = this.createDialog('编辑歌单文字', `
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

  // 打开歌单（导航到详情页面）
  openPlaylist(playlist) {
    this.currentPlaylist = playlist;
    this.showPlaylistDetailPage(playlist);
  }

  // 显示歌单详情页面
  showPlaylistDetailPage(playlist) {
    console.log('显示歌单详情页面:', playlist.name);
    
    // 直接操作页面元素，不依赖Sidebar的switchPage方法
    // 隐藏所有页面
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => {
      page.classList.remove('active');
    });
    
    // 显示歌单详情页面
    const playlistDetailPage = document.getElementById('playlistDetailPage');
    if (playlistDetailPage) {
      playlistDetailPage.classList.add('active');
      console.log('直接激活歌单详情页面');
    } else {
      console.error('找不到歌单详情页面元素');
      return;
    }
    
    // 移除侧边栏导航项的活跃状态
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
    });
    
    // 等待页面切换完成后再设置内容
    setTimeout(() => {
      console.log('页面切换完成，设置页面内容');
      this.setupPlaylistDetailPage(playlist);
    }, 50);
  }

  // 设置歌单详情页面内容
  setupPlaylistDetailPage(playlist) {
    console.log('设置歌单详情页面内容:', playlist);
    console.log('歌单歌曲数量:', playlist.songs.length);
    console.log('歌单歌曲列表:', playlist.songs);
    
    const titleElement = document.getElementById('playlistDetailTitle');
    const metaElement = document.getElementById('playlistDetailMeta');
    const songsContainer = document.getElementById('playlistDetailSongs');
    
    console.log('页面元素检查:', {
      titleElement: !!titleElement,
      metaElement: !!metaElement,
      songsContainer: !!songsContainer
    });
    
    if (titleElement) {
      titleElement.textContent = playlist.name;
      console.log('设置标题:', playlist.name);
      console.log('标题元素内容:', titleElement.textContent);
    } else {
      console.error('找不到标题元素: playlistDetailTitle');
    }
    
    if (metaElement) {
      const metaText = `${playlist.songs.length} 首歌曲 · 创建于 ${this.formatDate(playlist.createTime)}`;
      metaElement.textContent = metaText;
      console.log('设置元信息:', metaText);
      console.log('元信息元素内容:', metaElement.textContent);
    } else {
      console.error('找不到元信息元素: playlistDetailMeta');
    }
    
    if (songsContainer) {
      const songsHTML = this.renderPlaylistSongs(playlist.songs, false);
      console.log('生成的歌曲HTML长度:', songsHTML.length);
      console.log('生成的歌曲HTML前200字符:', songsHTML.substring(0, 200));
      songsContainer.innerHTML = songsHTML;
      console.log('设置歌曲列表, 歌曲数量:', playlist.songs.length);
      console.log('歌曲容器内容长度:', songsContainer.innerHTML.length);
      console.log('歌曲容器子元素数量:', songsContainer.children.length);
    } else {
      console.error('找不到歌曲容器元素: playlistDetailSongs');
    }
    
    // 检查页面是否可见
    const playlistDetailPage = document.getElementById('playlistDetailPage');
    if (playlistDetailPage) {
      console.log('歌单详情页面可见性:', {
        display: getComputedStyle(playlistDetailPage).display,
        visibility: getComputedStyle(playlistDetailPage).visibility,
        opacity: getComputedStyle(playlistDetailPage).opacity,
        hasActiveClass: playlistDetailPage.classList.contains('active')
      });
    }
    
    // 绑定页面事件
    this.bindPlaylistDetailPageEvents(playlist);
  }

  // 绑定歌单详情页面事件
  bindPlaylistDetailPageEvents(playlist) {
    // 先清除之前的事件监听器
    this.clearDetailPageEvents();
    
    const backBtn = document.getElementById('backToPlaylistsBtn');
    const playAllBtn = document.getElementById('playAllDetailBtn');
    const editPlaylistMainBtn = document.getElementById('editPlaylistMainBtn');
    const manageToggleBtn = document.getElementById('manageDetailToggleBtn');
    const managementToolbar = document.getElementById('playlistDetailToolbar');
    const songsContainer = document.getElementById('playlistDetailSongs');
    
    console.log('绑定歌单详情页面事件:', {
      backBtn: !!backBtn,
      playAllBtn: !!playAllBtn,
      editPlaylistMainBtn: !!editPlaylistMainBtn,
      manageToggleBtn: !!manageToggleBtn,
      managementToolbar: !!managementToolbar,
      songsContainer: !!songsContainer,
      playlist: playlist.name
    });
    
    let isManageMode = false;

    // 返回歌单列表
    if (backBtn) {
      this.backBtnHandler = () => {
        console.log('返回歌单列表');
        
        // 直接操作页面元素
        const allPages = document.querySelectorAll('.page');
        allPages.forEach(page => {
          page.classList.remove('active');
        });
        
        // 显示歌单页面
        const playlistPage = document.getElementById('playlistPage');
        if (playlistPage) {
          playlistPage.classList.add('active');
        }
        
        // 激活歌单导航项
        const playlistNavItem = document.querySelector('[data-page="playlist"]');
        if (playlistNavItem) {
          const navItems = document.querySelectorAll('.nav-item');
          navItems.forEach(item => item.classList.remove('active'));
          playlistNavItem.classList.add('active');
        }
      };
      backBtn.addEventListener('click', this.backBtnHandler);
    }

    // 播放全部
    if (playAllBtn) {
      this.playAllBtnHandler = () => {
        console.log('播放全部歌曲');
        this.playPlaylist(playlist);
      };
      playAllBtn.addEventListener('click', this.playAllBtnHandler);
    }

    // 编辑歌单（主要按钮）
    if (editPlaylistMainBtn) {
      this.editPlaylistMainBtnHandler = () => {
        console.log('编辑歌单');
        this.editPlaylist(playlist);
      };
      editPlaylistMainBtn.addEventListener('click', this.editPlaylistMainBtnHandler);
    }

    // 管理模式切换
    if (manageToggleBtn) {
      this.manageToggleBtnHandler = () => {
        isManageMode = !isManageMode;
        console.log('切换管理模式:', isManageMode);
        
        if (isManageMode) {
          // 切换到管理模式
          manageToggleBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            <span>退出管理</span>
          `;
          if (managementToolbar) {
            managementToolbar.style.display = 'flex';
          }
          songsContainer.innerHTML = this.renderPlaylistSongs(playlist.songs, true);
          this.bindDetailManagementEvents(playlist);
        } else {
          // 切换到查看模式
          manageToggleBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            <span>管理歌单</span>
          `;
          if (managementToolbar) {
            managementToolbar.style.display = 'none';
          }
          songsContainer.innerHTML = this.renderPlaylistSongs(playlist.songs, false);
        }
        
        // 重新绑定歌曲项事件
        this.bindDetailSongItemEvents(playlist, isManageMode);
      };
      manageToggleBtn.addEventListener('click', this.manageToggleBtnHandler);
    }

    // 初始绑定歌曲项事件
    this.bindDetailSongItemEvents(playlist, isManageMode);
  }

  // 清除详情页面事件监听器
  clearDetailPageEvents() {
    const backBtn = document.getElementById('backToPlaylistsBtn');
    const playAllBtn = document.getElementById('playAllDetailBtn');
    const editPlaylistMainBtn = document.getElementById('editPlaylistMainBtn');
    const manageToggleBtn = document.getElementById('manageDetailToggleBtn');
    
    if (backBtn && this.backBtnHandler) {
      backBtn.removeEventListener('click', this.backBtnHandler);
    }
    if (playAllBtn && this.playAllBtnHandler) {
      playAllBtn.removeEventListener('click', this.playAllBtnHandler);
    }
    if (editPlaylistMainBtn && this.editPlaylistMainBtnHandler) {
      editPlaylistMainBtn.removeEventListener('click', this.editPlaylistMainBtnHandler);
    }
    if (manageToggleBtn && this.manageToggleBtnHandler) {
      manageToggleBtn.removeEventListener('click', this.manageToggleBtnHandler);
    }
    
    // 也清除管理事件监听器
    this.clearDetailManagementEvents();
  }

  // 渲染歌单歌曲
  renderPlaylistSongs(songs, isManageMode = false) {
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
      <div class="song-item ${isManageMode ? 'management-mode' : ''}" data-index="${index}" data-bvid="${song.bvid}">
        ${isManageMode ? `
          <div class="song-checkbox">
            <input type="checkbox" id="song-${index}">
          </div>
        ` : `
          <div class="song-index">${index + 1}</div>
        `}
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

  // 绑定详情页面管理功能事件
  bindDetailManagementEvents(playlist) {
    // 先清除之前的事件监听器，避免重复绑定
    this.clearDetailManagementEvents();
    
    const selectAllBtn = document.getElementById('selectAllDetailBtn');
    const selectNoneBtn = document.getElementById('selectNoneDetailBtn');
    const batchRemoveBtn = document.getElementById('batchRemoveDetailBtn');
    const addSongsBtn = document.getElementById('addSongsDetailBtn');
    const selectedCountElement = document.getElementById('selectedDetailCount');

    // 全选
    if (selectAllBtn) {
      this.selectAllBtnHandler = () => {
        const checkboxes = document.querySelectorAll('#playlistDetailSongs .song-checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          checkbox.checked = true;
        });
        this.updateDetailSelectionState();
      };
      selectAllBtn.addEventListener('click', this.selectAllBtnHandler);
    }

    // 取消选择
    if (selectNoneBtn) {
      this.selectNoneBtnHandler = () => {
        const checkboxes = document.querySelectorAll('#playlistDetailSongs .song-checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          checkbox.checked = false;
        });
        this.updateDetailSelectionState();
      };
      selectNoneBtn.addEventListener('click', this.selectNoneBtnHandler);
    }

    // 批量删除
    if (batchRemoveBtn) {
      this.batchRemoveBtnHandler = () => {
        const checkboxes = document.querySelectorAll('#playlistDetailSongs .song-checkbox input[type="checkbox"]:checked');
        if (checkboxes.length === 0) return;

        const dialog = this.createDialog('批量删除歌曲', `
          <div class="dialog-body">
            <p>确定要从歌单中删除选中的 ${checkboxes.length} 首歌曲吗？</p>
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
              // 获取要删除的歌曲索引
              const indicesToRemove = Array.from(checkboxes).map(cb => {
                return parseInt(cb.closest('.song-item').dataset.index);
              }).sort((a, b) => b - a); // 从后往前删除

              // 删除歌曲
              indicesToRemove.forEach(index => {
                const song = playlist.songs[index];
                this.playlistManager.removeSong(playlist.id, song.bvid);
                playlist.songs.splice(index, 1);
              });

              // 刷新显示
              const songsContainer = document.getElementById('playlistDetailSongs');
              songsContainer.innerHTML = this.renderPlaylistSongs(playlist.songs, true);
              this.bindDetailManagementEvents(playlist);
              this.bindDetailSongItemEvents(playlist, true);
              
              // 更新歌单列表
              this.loadPlaylists();
              // 更新页面头部信息
              const metaElement = document.getElementById('playlistDetailMeta');
              if (metaElement) {
                metaElement.textContent = `${playlist.songs.length} 首歌曲 · 创建于 ${this.formatDate(playlist.createTime)}`;
              }
              
              this.showToast(`已删除 ${indicesToRemove.length} 首歌曲`);
              dialog.close();
            }
          }
        ]);
      };
      batchRemoveBtn.addEventListener('click', this.batchRemoveBtnHandler);
    }

    // 添加歌曲
    if (addSongsBtn) {
      this.addSongsBtnHandler = () => {
        // 可以在这里实现添加歌曲功能，比如打开搜索选择器
        this.showToast('请在搜索页面找到歌曲并添加到歌单');
      };
      addSongsBtn.addEventListener('click', this.addSongsBtnHandler);
    }
  }

  // 清除详情页面管理事件监听器
  clearDetailManagementEvents() {
    const selectAllBtn = document.getElementById('selectAllDetailBtn');
    const selectNoneBtn = document.getElementById('selectNoneDetailBtn');
    const batchRemoveBtn = document.getElementById('batchRemoveDetailBtn');
    const addSongsBtn = document.getElementById('addSongsDetailBtn');
    
    if (selectAllBtn && this.selectAllBtnHandler) {
      selectAllBtn.removeEventListener('click', this.selectAllBtnHandler);
    }
    if (selectNoneBtn && this.selectNoneBtnHandler) {
      selectNoneBtn.removeEventListener('click', this.selectNoneBtnHandler);
    }
    if (batchRemoveBtn && this.batchRemoveBtnHandler) {
      batchRemoveBtn.removeEventListener('click', this.batchRemoveBtnHandler);
    }
    if (addSongsBtn && this.addSongsBtnHandler) {
      addSongsBtn.removeEventListener('click', this.addSongsBtnHandler);
    }
  }

  // 绑定详情页面歌曲项事件
  bindDetailSongItemEvents(playlist, isManageMode) {
    const songItems = document.querySelectorAll('#playlistDetailSongs .song-item');

    songItems.forEach((item, index) => {
      const playBtn = item.querySelector('.play-song-btn');
      const removeBtn = item.querySelector('.remove-song-btn');

      // 双击播放（仅在查看模式）
      if (!isManageMode) {
        item.addEventListener('dblclick', () => {
          this.playSongFromPlaylist(playlist, index);
        });
      } else {
        // 管理模式下的复选框事件
        const checkbox = item.querySelector('.song-checkbox input[type="checkbox"]');
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            this.updateDetailSelectionState();
          });
        }
      }

      // 播放按钮
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.playSongFromPlaylist(playlist, index);
        });
      }

      // 移除按钮
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.confirmRemoveSong(playlist, index, () => {
            // 刷新显示
            const songsContainer = document.getElementById('playlistDetailSongs');
            songsContainer.innerHTML = this.renderPlaylistSongs(playlist.songs, isManageMode);
            this.bindDetailSongItemEvents(playlist, isManageMode);
            if (isManageMode) {
              this.bindDetailManagementEvents(playlist);
            }
            
            // 更新页面头部信息
            const metaElement = document.getElementById('playlistDetailMeta');
            if (metaElement) {
              metaElement.textContent = `${playlist.songs.length} 首歌曲 · 创建于 ${this.formatDate(playlist.createTime)}`;
            }
          });
        });
      }
    });
  }

  // 更新详情页面选择状态
  updateDetailSelectionState() {
    const checkboxes = document.querySelectorAll('#playlistDetailSongs .song-checkbox input[type="checkbox"]');
    const checkedBoxes = document.querySelectorAll('#playlistDetailSongs .song-checkbox input[type="checkbox"]:checked');
    const batchRemoveBtn = document.getElementById('batchRemoveDetailBtn');
    const selectedCountElement = document.getElementById('selectedDetailCount');

    const selectedCount = checkedBoxes.length;
    
    if (selectedCountElement) {
      selectedCountElement.textContent = selectedCount.toString();
    }
    
    if (batchRemoveBtn) {
      batchRemoveBtn.disabled = selectedCount === 0;
    }
  }

  // 确认删除单首歌曲
  confirmRemoveSong(playlist, index, callback) {
    const song = playlist.songs[index];
    const dialog = this.createDialog('删除歌曲', `
      <div class="dialog-body">
        <p>确定要从歌单中删除歌曲 "<strong>${song.title}</strong>" 吗？</p>
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
          this.removeSongFromPlaylist(playlist.id, song.bvid);
          playlist.songs.splice(index, 1);
          callback();
          dialog.close();
        }
      }
    ]);
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