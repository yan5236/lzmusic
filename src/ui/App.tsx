import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import BottomPlayer from './components/BottomPlayer';
import FullPlayer from './components/FullPlayer';
import PlaylistDrawer from './components/PlaylistDrawer';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import HistoryView from './views/HistoryView';
import DefaultView from './views/DefaultView';
import Toast from './components/Toast';
import type { ToastMessage } from './components/Toast';
import type { Song, PlayerState } from './types';
import { ViewState, PlaybackMode } from './types';
import { useAudioPlayer } from './hooks/useAudioPlayer';

function App() {
  // Application State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast 消息管理
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

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
    lyricsOffset: 0, // 歌词偏移默认0ms
  });

  // 上一首歌曲ID引用,用于检测歌曲变化（使用ID而非对象引用，避免歌词更新时触发重新播放）
  const prevSongIdRef = useRef<string | null>(null);

  // 使用ref存储audioPlayer，避免循环依赖
  const audioPlayerRef = useRef<ReturnType<typeof useAudioPlayer> | null>(null);

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
    // 自动跳到下一首
    handleAutoNextSong();
  }, [handleAutoNextSong]);

  const handleVolumeChange = useCallback((volume: number) => {
    setPlayerState((prev) => ({ ...prev, volume }));
  }, []);

  // 初始化音频播放器
  const audioPlayer = useAudioPlayer({
    onPlayStateChange: handlePlayStateChange,
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
    onError: handleError,
    onVolumeChange: handleVolumeChange,
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

      loadLyricsFromDb();
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

  // 歌词设置相关函数
  const updateLyricsFontSize = (size: number) => {
    setPlayerState(prev => ({ ...prev, lyricsFontSize: size }));
  };

  const updateLyricsOffset = (offset: number) => {
    setPlayerState(prev => ({ ...prev, lyricsOffset: offset }));
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

  /**
   * Toast 消息管理函数
   * 添加新的 Toast 消息
   */
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, message, type, duration };
    setToastMessages(prev => [...prev, newToast]);
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
        return <HomeView playerState={playerState} playSong={playSong} />;

      case ViewState.SEARCH:
        return <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} playSong={playSong} />;

      case ViewState.HISTORY:
        return <HistoryView playerState={playerState} playSong={playSong} />;

      default:
        return <DefaultView currentView={currentView} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-secondary overflow-hidden font-sans select-none">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-secondary">
        {/* Top Navigation / Header (simplified) */}
        <header className="h-16 flex items-center justify-between px-8 bg-transparent z-20">
             <div className="flex gap-4"></div>
             <div className="flex items-center gap-3"></div>
        </header>

        <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
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
        />
      </div>

      {/* Playlist Drawer */}
      <PlaylistDrawer playerState={playerState} togglePlaylist={togglePlaylist} playSong={playSong} />

      {/* Toast 通知容器 */}
      <Toast messages={toastMessages} onRemove={removeToast} />
    </div>
  );
}

export default App;
