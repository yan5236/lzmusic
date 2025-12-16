import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import BottomPlayer from './components/BottomPlayer';
import FullPlayer from './components/FullPlayer';
import PlaylistDrawer from './components/PlaylistDrawer';
import AddToPlaylistDialog from './components/AddToPlaylistDialog';
import AgreementDialog from './components/AgreementDialog';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';
import DefaultView from './views/DefaultView';
import PlaylistsView from './views/PlaylistsView';
import PlaylistDetailView from './views/PlaylistDetailView';
import LocalView from './views/LocalView';
import Toast from './components/Toast';
import TitleBar from './components/TitleBar';
import type { ToastMessage } from './components/Toast';
import type { Song, PlayerState } from './types';
import { ViewState, PlaybackMode } from './types';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { notifyPlaylistUpdated } from './utils/playlistEvents';
import { applyThemeColor, getInitialThemeColor, normalizeThemeColor, persistThemeColor } from './utils/theme';

function App() {
  // Application State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // 检查用户是否已同意协议（从 localStorage 读取）
  const [showAgreement, setShowAgreement] = useState(() => {
    const agreed = localStorage.getItem('agreementAccepted');
    return agreed !== 'true'; // 如果已同意则不显示
  });

  // Toast 消息管理
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  // 歌单详情视图状态
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);

  // 添加到歌单对话框状态
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);

  // 从 localStorage 读取保存的封面样式设置
  const savedCoverStyle = localStorage.getItem('coverStyle') as 'normal' | 'vinyl' | null;

  // 主题色
  const [themeColor, setThemeColor] = useState<string>(() => {
    const initialColor = getInitialThemeColor();
    applyThemeColor(initialColor);
    return initialColor;
  });

  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentSong: null, // 初始为空,避免自动播放模拟数据
    currentTime: 0,
    volume: 0.8,
    isFullPlayerOpen: false,
    queue: [], // 初始队列为空
    showPlaylist: false,
    mode: PlaybackMode.LOOP,
    history: [],
    lyricsFontSize: 18, // 歌词字体大小默认18px
    lyricsOffset: 0, // 当前歌曲的歌词偏移(ms)，从数据库加载
    coverStyle: savedCoverStyle || 'normal', // 播放界面封面样式
  });

  // 主题色变化时，应用到全局 CSS 变量
  useEffect(() => {
    applyThemeColor(themeColor);
  }, [themeColor]);

  // 应用启动时从数据库加载历史记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const result = await window.electron.invoke('app-db-history-get');
        if (result.success && result.data && result.data.length > 0) {
          // 将数据库记录转换为 Song 格式
          const historySongs: Song[] = result.data.map((record) => ({
            id: record.id,
            title: record.title,
            artist: record.artist,
            album: record.album,
            coverUrl: record.coverUrl,
            duration: record.duration,
            bvid: record.bvid,
            cid: record.cid,
            pages: record.pages,
            source: record.source,
          }));
          setPlayerState(prev => ({ ...prev, history: historySongs }));
          console.log(`已从数据库加载 ${historySongs.length} 条历史记录`);
        }
      } catch (error) {
        console.error('加载历史记录失败:', error);
      }
    };

    loadHistory();
  }, []);

  // 上一首歌曲ID引用,用于检测歌曲变化（使用ID而非对象引用，避免歌词更新时触发重新播放）
  const prevSongIdRef = useRef<string | null>(null);

  // 使用ref存储audioPlayer，避免循环依赖
  const audioPlayerRef = useRef<ReturnType<typeof useAudioPlayer> | null>(null);

  /**
   * Toast 消息管理函数
   * 添加新的 Toast 消息
   */
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, message, type, duration };
    setToastMessages(prev => [...prev, newToast]);
  }, []);

  /**
   * 处理自动播放下一首歌曲的辅助函数
   */
  const handleAutoNextSong = useCallback(() => {
    setPlayerState((prev) => {
      // 如果没有当前歌曲或队列为空,停止播放
      if (!prev.currentSong || prev.queue.length === 0) {
        return { ...prev, isPlaying: false };
      }

      let nextIndex = 0;
      const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);

      if (prev.mode === PlaybackMode.SINGLE) {
        // 单曲循环 - 重新播放当前歌曲
        return prev;
      } else if (prev.mode === PlaybackMode.SHUFFLE) {
        // 随机播放
        nextIndex = Math.floor(Math.random() * prev.queue.length);
      } else {
        // 列表循环
        nextIndex = (currentIndex + 1) % prev.queue.length;
      }

      const nextSong = prev.queue[nextIndex];

      // 如果队列只有一首歌且不是单曲循环模式,播放完后停止
      // 注意: 单曲循环模式已在上面return,这里只处理列表循环和随机模式
      if (prev.queue.length === 1 && nextSong && nextSong.id === prev.currentSong.id) {
        return { ...prev, isPlaying: false };
      }

      const newHistory = [prev.currentSong, ...prev.history]
        .filter((s, i) => s.id !== prev.currentSong?.id || i === 0)
        .slice(0, 50);

      return {
        ...prev,
        currentSong: nextSong,
        currentTime: 0,
        history: newHistory,
      };
    });
  }, []);

  // 使用useCallback稳定化回调函数，避免audioPlayer引用变化
  const handlePlayStateChange = useCallback((isPlaying: boolean) => {
    setPlayerState((prev) => ({ ...prev, isPlaying }));
  }, []);

  const handleTimeUpdate = useCallback((currentTime: number) => {
    setPlayerState((prev) => ({ ...prev, currentTime }));
  }, []);

  const handleEnded = useCallback(() => {
    // 使用函数式更新来获取最新的state
    setPlayerState((prev) => {
      // 根据播放模式处理
      if (prev.mode === PlaybackMode.SINGLE) {
        // 单曲循环 - 重新播放
        if (prev.currentSong && audioPlayerRef.current) {
          // 使用setTimeout确保在state更新后执行
          setTimeout(() => {
            if (prev.currentSong && audioPlayerRef.current) {
              audioPlayerRef.current.loadAndPlay(prev.currentSong);
            }
          }, 0);
        }
        return prev;
      }

      // 列表循环或随机播放 - 播放下一首
      // 如果没有当前歌曲或队列为空,停止播放
      if (!prev.currentSong || prev.queue.length === 0) {
        return { ...prev, isPlaying: false };
      }

      let nextIndex = 0;
      const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);

      if (prev.mode === PlaybackMode.SHUFFLE) {
        // 随机播放
        nextIndex = Math.floor(Math.random() * prev.queue.length);
      } else {
        // 列表循环
        nextIndex = (currentIndex + 1) % prev.queue.length;
      }

      const nextSong = prev.queue[nextIndex];

      // 如果队列只有一首歌,播放完后停止
      if (prev.queue.length === 1 && nextSong && nextSong.id === prev.currentSong.id) {
        return { ...prev, isPlaying: false };
      }

      const newHistory = [prev.currentSong, ...prev.history]
        .filter((s, i) => s.id !== prev.currentSong?.id || i === 0)
        .slice(0, 50);

      return {
        ...prev,
        currentSong: nextSong,
        currentTime: 0,
        history: newHistory,
      };
    });
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('音频播放错误:', error);
    // 显示错误提示
    showToast(error.message || '音频播放失败', 'error');
    // 自动跳到下一首
    handleAutoNextSong();
  }, [handleAutoNextSong, showToast]);

  const handleVolumeChange = useCallback((volume: number) => {
    setPlayerState((prev) => ({ ...prev, volume }));
  }, []);

  // 处理音频实际时长更新（解决B站API返回的duration不准确问题）
  const handleDurationChange = useCallback((duration: number) => {
    setPlayerState((prev) => {
      if (!prev.currentSong) return prev;
      // 只有当差异超过0.5秒时才更新，避免不必要的渲染
      if (Math.abs(prev.currentSong.duration - duration) > 0.5) {
        return {
          ...prev,
          currentSong: {
            ...prev.currentSong,
            duration: duration
          }
        };
      }
      return prev;
    });
  }, []);

  // 初始化音频播放器
  const audioPlayer = useAudioPlayer({
    onPlayStateChange: handlePlayStateChange,
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
    onError: handleError,
    onVolumeChange: handleVolumeChange,
    onDurationChange: handleDurationChange,
  });

  // 更新audioPlayerRef
  useEffect(() => {
    audioPlayerRef.current = audioPlayer;
  });

  // 监听当前歌曲变化,自动加载和播放
  useEffect(() => {
    const currentSong = playerState.currentSong;
    const currentSongId = currentSong?.id || null;

    // 检查歌曲ID是否发生变化（使用ID比较而非对象引用，避免歌词更新时触发重新播放）
    if (currentSong && currentSongId !== prevSongIdRef.current) {
      prevSongIdRef.current = currentSongId;

      // 加载并播放新歌曲（使用ref获取最新的audioPlayer）
      if (audioPlayerRef.current) {
        audioPlayerRef.current.loadAndPlay(currentSong);
      }

      // 从数据库加载歌词（后台异步加载，不会影响播放）
      const loadLyricsFromDb = async () => {
        try {
          const songId = currentSong.bvid || currentSong.id;
          const result = await window.electron.invoke('lyrics-db-get', songId);

          if (result.success && result.data) {
            // 如果数据库中有歌词，更新当前歌曲的歌词
            setPlayerState(prev => {
              // 确保当前歌曲未改变，才更新歌词
              if (!prev.currentSong || prev.currentSong.id !== currentSong.id) {
                return prev;
              }
              return {
                ...prev,
                currentSong: {
                  ...prev.currentSong,
                  lyrics: result.data || undefined, // 将 null 转换为 undefined
                },
              };
            });
            console.log(`已从数据库加载歌词 [ID: ${songId}]`);
          } else {
            console.log(`数据库中没有该歌曲的歌词 [ID: ${songId}]`);
          }
        } catch (error) {
          console.error('从数据库加载歌词失败:', error);
        }
      };

      // 从数据库加载该歌曲的歌词偏移设置
      const loadLyricsOffset = async () => {
        try {
          const songId = currentSong.bvid || currentSong.id;
          const result = await window.electron.invoke('app-db-offset-get', songId);

          if (result.success) {
            setPlayerState(prev => {
              // 确保当前歌曲未改变
              if (!prev.currentSong || prev.currentSong.id !== currentSong.id) {
                return prev;
              }
              return {
                ...prev,
                lyricsOffset: result.offset || 0,
              };
            });
            if (result.offset !== 0) {
              console.log(`已加载歌词偏移 [ID: ${songId}, 偏移: ${result.offset}ms]`);
            }
          }
        } catch (error) {
          console.error('加载歌词偏移失败:', error);
        }
      };

      // 保存歌曲到历史记录数据库
      const saveToHistory = async () => {
        try {
          await window.electron.invoke('app-db-history-add', {
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist,
            album: currentSong.album,
            coverUrl: currentSong.coverUrl,
            duration: currentSong.duration,
            bvid: currentSong.bvid,
            cid: currentSong.cid,
            pages: currentSong.pages,
            source: currentSong.source,
          });
          console.log(`已保存到历史记录 [ID: ${currentSong.id}]`);
        } catch (error) {
          console.error('保存历史记录失败:', error);
        }
      };

      loadLyricsFromDb();
      loadLyricsOffset();
      saveToHistory();
    }
  }, [playerState.currentSong]); // 移除audioPlayer依赖，使用audioPlayerRef

  // Actions
  const togglePlay = () => {
    audioPlayer.togglePlay();
  };

  const toggleMode = () => {
    setPlayerState(prev => {
      const modes = [PlaybackMode.LOOP, PlaybackMode.SINGLE, PlaybackMode.SHUFFLE];
      const nextIndex = (modes.indexOf(prev.mode) + 1) % modes.length;
      return { ...prev, mode: modes[nextIndex] };
    });
  };

  const nextSong = () => {
    if (!playerState.currentSong) return;
    // Manual next usually forces a change.
    // If Shuffle, random. Else, next in list (even in Single mode, manual next usually goes next).
    setPlayerState(prev => {
        let nextIndex;
        if (prev.mode === PlaybackMode.SHUFFLE) {
            nextIndex = Math.floor(Math.random() * prev.queue.length);
        } else {
            const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);
            nextIndex = (currentIndex + 1) % prev.queue.length;
        }

        // Add current to history before switching
        const newHistory = prev.currentSong ? [prev.currentSong, ...prev.history].filter(s => s.id !== prev.currentSong?.id).slice(0, 50) : prev.history;

        return {
            ...prev,
            currentSong: prev.queue[nextIndex],
            currentTime: 0,
            isPlaying: true,
            history: newHistory
        };
    });
  };

  const prevSong = () => {
    if (!playerState.currentSong) return;
    setPlayerState(prev => {
        let prevIndex;
        if (prev.mode === PlaybackMode.SHUFFLE) {
             prevIndex = Math.floor(Math.random() * prev.queue.length);
        } else {
            const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);
            prevIndex = (currentIndex - 1 + prev.queue.length) % prev.queue.length;
        }

        return {
            ...prev,
            currentSong: prev.queue[prevIndex],
            currentTime: 0,
            isPlaying: true
        };
    });
  };

  const seek = (time: number) => {
    audioPlayer.seek(time);
    setPlayerState(prev => ({ ...prev, currentTime: time }));
  };

  const changeVolume = (val: number) => {
    audioPlayer.setVolume(val);
    setPlayerState(prev => ({ ...prev, volume: val }));
  };

  const playSong = (song: Song) => {
    // 检查是否点击了当前正在播放的同一首歌
    // 使用 audioPlayer 中保存的歌曲信息进行比较，即使从播放列表中删除了也能正确识别
    const currentAudioSong = audioPlayerRef.current?.getCurrentSong();
    const isSameSong = currentAudioSong?.id === song.id;

    if (isSameSong) {
      // 如果是同一首歌，检查音频源是否还存在
      const playState = audioPlayerRef.current?.getPlayState();
      const hasAudioSrc = playState && playState.duration > 0;

      if (hasAudioSrc) {
        // 音频源存在，重新从头播放
        if (audioPlayerRef.current) {
          audioPlayerRef.current.seek(0);
          audioPlayerRef.current.play();
        }
        setPlayerState(prev => ({
          ...prev,
          currentSong: song,  // 重新设置 currentSong，确保状态同步
          currentTime: 0,
          isPlaying: true,
        }));
      } else {
        // 音频源已清空（可能被从播放列表删除），需要重新加载
        // 重置 prevSongIdRef，强制触发 loadAndPlay
        prevSongIdRef.current = null;

        setPlayerState(prev => {
          // 如果队列中不存在该歌曲,添加到队列
          const isInQueue = prev.queue.some(s => s.id === song.id);
          const newQueue = isInQueue ? prev.queue : [...prev.queue, song];

          return {
            ...prev,
            currentSong: song,
            currentTime: 0,
            isPlaying: true,
            queue: newQueue,
          };
        });
      }
      return;
    }

    // 不同的歌曲，正常切换
    setPlayerState(prev => {
        // Add to history if it's a new song
        const newHistory = [song, ...prev.history].filter((s, index, self) =>
            index === self.findIndex((t) => (t.id === s.id))
        ).slice(0, 50);

        // 如果队列中不存在该歌曲,添加到队列
        const isInQueue = prev.queue.some(s => s.id === song.id);
        const newQueue = isInQueue ? prev.queue : [...prev.queue, song];

        return {
            ...prev,
            currentSong: song,
            currentTime: 0,
            isPlaying: true,
            history: newHistory,
            queue: newQueue,
        };
    });
  };

  const toggleFullPlayer = () => {
    setPlayerState(prev => ({ ...prev, isFullPlayerOpen: !prev.isFullPlayerOpen }));
  };

  const togglePlaylist = () => {
      setPlayerState(prev => ({ ...prev, showPlaylist: !prev.showPlaylist }));
  };

  // 从播放队列中移除歌曲
  const removeFromQueue = (songId: string) => {
    // 先检查是否要删除当前播放的歌曲，如果是，需要先停止播放
    const isRemovingCurrentSong = playerState.currentSong?.id === songId;

    if (isRemovingCurrentSong && audioPlayerRef.current) {
      // 立即停止当前音频，避免在状态更新后触发错误
      audioPlayerRef.current.stop();
    }

    setPlayerState(prev => {
      const newQueue = prev.queue.filter(s => s.id !== songId);

      // 如果删除的是当前播放的歌曲，切换到下一首或停止播放
      if (prev.currentSong?.id === songId) {
        if (newQueue.length === 0) {
          // 队列为空，停止播放
          return {
            ...prev,
            queue: newQueue,
            currentSong: null,
            isPlaying: false,
            currentTime: 0
          };
        } else {
          // 播放队列中的下一首
          const currentIndex = prev.queue.findIndex(s => s.id === songId);
          const nextIndex = currentIndex >= newQueue.length ? 0 : currentIndex;
          return {
            ...prev,
            queue: newQueue,
            currentSong: newQueue[nextIndex],
            currentTime: 0
          };
        }
      }

      return { ...prev, queue: newQueue };
    });
  };

  // 歌词设置相关函数
  const updateLyricsFontSize = (size: number) => {
    setPlayerState(prev => ({ ...prev, lyricsFontSize: size }));
  };

  const updateLyricsOffset = async (offset: number) => {
    setPlayerState(prev => ({ ...prev, lyricsOffset: offset }));

    // 保存到数据库（每首歌独立的偏移设置）
    const currentSong = playerState.currentSong;
    if (currentSong) {
      try {
        const songId = currentSong.bvid || currentSong.id;
        await window.electron.invoke('app-db-offset-save', songId, offset);
        console.log(`歌词偏移已保存 [ID: ${songId}, 偏移: ${offset}ms]`);
      } catch (error) {
        console.error('保存歌词偏移失败:', error);
      }
    }
  };

  const updateCurrentSongLyrics = (lyrics: string[]) => {
    setPlayerState(prev => {
      if (!prev.currentSong) return prev;
      return {
        ...prev,
        currentSong: {
          ...prev.currentSong,
          lyrics,
        },
      };
    });
  };

  // 更新主题色并持久化
  const updateThemeColor = useCallback((color: string) => {
    const normalized = normalizeThemeColor(color);
    if (!normalized) {
      showToast('请输入有效的颜色值', 'error');
      return;
    }
    setThemeColor(normalized);
    persistThemeColor(normalized);
  }, [showToast]);

  // 更新封面样式并保存到 localStorage
  const updateCoverStyle = (style: 'normal' | 'vinyl') => {
    localStorage.setItem('coverStyle', style);
    setPlayerState(prev => ({ ...prev, coverStyle: style }));
  };

  const handleAgreementAccept = () => {
    // 保存用户同意状态到 localStorage
    localStorage.setItem('agreementAccepted', 'true');
    setShowAgreement(false);
  };

  const handleExitApp = () => {
    window.close();
  };

  /**
   * 歌单相关操作函数
   */
  const navigateToPlaylistDetail = (playlistId: string) => {
    setCurrentPlaylistId(playlistId);
    setCurrentView('PLAYLIST_DETAIL' as ViewState);
  };

  const navigateBackFromPlaylistDetail = () => {
    setCurrentPlaylistId(null);
    setCurrentView(ViewState.PLAYLISTS);
  };

  const handleAddCurrentSongToPlaylist = () => {
    if (playerState.currentSong) {
      setShowAddToPlaylistDialog(true);
    } else {
      showToast('当前没有播放歌曲');
    }
  };

  const handleAddSongToPlaylist = async (playlistId: string) => {
    if (!playerState.currentSong) return;

    try {
      const result = await window.electron.invoke(
        'app-db-playlist-add-song',
        playlistId,
        playerState.currentSong
      );

      if (result.success) {
        showToast('已添加到歌单', 'success');
        // 触发歌单更新事件，通知相关视图刷新数据
        notifyPlaylistUpdated();
      } else {
        showToast('添加失败', 'error');
      }
    } catch (error) {
      console.error('添加到歌单失败:', error);
      showToast('添加失败', 'error');
    }
  };

  const handleCreatePlaylist = async (
    name: string,
    description?: string
  ): Promise<string> => {
    const result = await window.electron.invoke(
      'app-db-playlist-create',
      name,
      description
    );

    if (result.success && result.id) {
      return result.id;
    } else {
      throw new Error('创建歌单失败');
    }
  };

  const handlePlayAllFromPlaylist = (songs: Song[]) => {
    if (songs.length > 0) {
      setPlayerState(prev => ({
        ...prev,
        queue: songs,
      }));
      playSong(songs[0]);
    }
  };

  /**
   * 移除指定的 Toast 消息
   */
  const removeToast = (id: string) => {
    setToastMessages(prev => prev.filter(msg => msg.id !== id));
  };

  /**
   * 视图渲染辅助函数
   * 根据当前视图状态渲染对应的页面组件
   */
  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME:
        return (
          <HomeView
            playerState={playerState}
            playSong={playSong}
            onNavigateToPlaylist={navigateToPlaylistDetail}
            onShowToast={showToast}
          />
        );

      case ViewState.SEARCH:
        return (
          <SearchView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            playSong={playSong}
            onShowToast={showToast}
          />
        );

      case ViewState.PLAYLISTS:
        return (
          <PlaylistsView
            onNavigateToDetail={navigateToPlaylistDetail}
            onShowToast={showToast}
          />
        );

      case 'PLAYLIST_DETAIL' as ViewState:
        return currentPlaylistId ? (
          <PlaylistDetailView
            playlistId={currentPlaylistId}
            onNavigateBack={navigateBackFromPlaylistDetail}
            onPlaySong={playSong}
            onPlayAll={handlePlayAllFromPlaylist}
            onShowToast={showToast}
          />
        ) : null;

      case ViewState.HISTORY:
        return (
          <HistoryView
            playerState={playerState}
            playSong={playSong}
            onClearHistory={() => setPlayerState(prev => ({ ...prev, history: [] }))}
            onDeleteHistory={(songId) => setPlayerState(prev => ({
              ...prev,
              history: prev.history.filter(s => s.id !== songId)
            }))}
            onShowToast={showToast}
          />
        );

      case ViewState.LOCAL:
        return (
          <LocalView
            onPlaySong={playSong}
            onShowToast={showToast}
          />
        );

      case ViewState.SETTINGS:
        return (
          <SettingsView
            themeColor={themeColor}
            onThemeColorChange={updateThemeColor}
            coverStyle={playerState.coverStyle}
            onCoverStyleChange={updateCoverStyle}
            onShowToast={showToast}
          />
        );

      default:
        return <DefaultView currentView={currentView} />;
    }
  };

  return (
    <div className="h-screen w-screen bg-secondary overflow-hidden font-sans select-none">
      <TitleBar />
      <div className="flex h-full pt-12">
        <Sidebar currentView={currentView} onChangeView={setCurrentView} />

        {/* Main Content Area */}
        <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-secondary">
          <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-4 md:px-6">
            {renderView()}
          </main>

          {/* Full Player Overlay */}
          <FullPlayer
              isOpen={playerState.isFullPlayerOpen}
              onClose={toggleFullPlayer}
              playerState={playerState}
              seek={seek}
              togglePlay={togglePlay}
              nextSong={nextSong}
              prevSong={prevSong}
              setVolume={changeVolume}
              onFontSizeChange={updateLyricsFontSize}
              onOffsetChange={updateLyricsOffset}
              onLyricsApply={updateCurrentSongLyrics}
              showToast={showToast}
          />

          {/* Bottom Player */}
          <BottomPlayer
              playerState={playerState}
              togglePlay={togglePlay}
              nextSong={nextSong}
              prevSong={prevSong}
              seek={seek}
              changeVolume={changeVolume}
              toggleFullPlayer={toggleFullPlayer}
              togglePlaylist={togglePlaylist}
              toggleMode={toggleMode}
              onAddToPlaylist={handleAddCurrentSongToPlaylist}
          />
        </div>
      </div>

      {/* Playlist Drawer */}
      <PlaylistDrawer playerState={playerState} togglePlaylist={togglePlaylist} playSong={playSong} removeFromQueue={removeFromQueue} />

      {/* 添加到歌单对话框 */}
      <AddToPlaylistDialog
        isOpen={showAddToPlaylistDialog}
        onClose={() => setShowAddToPlaylistDialog(false)}
        song={playerState.currentSong}
        onAddToPlaylist={handleAddSongToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {/* Toast 通知容器 */}
      <Toast messages={toastMessages} onRemove={removeToast} />

      {/* 首次启动协议弹窗 */}
      <AgreementDialog
        open={showAgreement}
        onAccept={handleAgreementAccept}
        onExit={handleExitApp}
      />
    </div>
  );
}

export default App;
