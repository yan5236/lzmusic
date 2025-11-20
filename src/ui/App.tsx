import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import BottomPlayer from './components/BottomPlayer';
import FullPlayer from './components/FullPlayer';
import PlaylistDrawer from './components/PlaylistDrawer';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import HistoryView from './views/HistoryView';
import DefaultView from './views/DefaultView';
import type { Song, PlayerState } from './types';
import { ViewState, PlaybackMode } from './types';
import { useAudioPlayer } from './hooks/useAudioPlayer';

function App() {
  // Application State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  });

  // 上一首歌曲引用,用于检测歌曲变化
  const prevSongRef = useRef<Song | null>(null);

  /**
   * 处理自动播放下一首歌曲的辅助函数
   */
  const handleAutoNextSong = () => {
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
  };

  // 初始化音频播放器
  const audioPlayer = useAudioPlayer({
    // 播放状态改变回调
    onPlayStateChange: (isPlaying) => {
      setPlayerState((prev) => ({ ...prev, isPlaying }));
    },

    // 播放进度更新回调
    onTimeUpdate: (currentTime) => {
      setPlayerState((prev) => ({ ...prev, currentTime }));
    },

    // 歌曲播放结束回调
    onEnded: () => {
      // 根据播放模式处理
      if (playerState.mode === PlaybackMode.SINGLE) {
        // 单曲循环 - 重新播放
        if (playerState.currentSong) {
          audioPlayer.loadAndPlay(playerState.currentSong);
        }
      } else {
        // 列表循环或随机播放 - 播放下一首
        handleAutoNextSong();
      }
    },

    // 音频错误回调
    onError: (error) => {
      console.error('音频播放错误:', error);
      // 自动跳到下一首
      handleAutoNextSong();
    },

    // 音量改变回调
    onVolumeChange: (volume) => {
      setPlayerState((prev) => ({ ...prev, volume }));
    },
  });

  // 监听当前歌曲变化,自动加载和播放
  useEffect(() => {
    const currentSong = playerState.currentSong;

    // 检查歌曲是否发生变化
    if (currentSong && currentSong !== prevSongRef.current) {
      prevSongRef.current = currentSong;

      // 加载并播放新歌曲
      audioPlayer.loadAndPlay(currentSong);
    }
  }, [playerState.currentSong, audioPlayer]);

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
    </div>
  );
}

export default App;
