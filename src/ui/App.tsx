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
import { MOCK_SONGS } from './constants';

function App() {
  // Application State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentSong: MOCK_SONGS[0],
    currentTime: 0,
    volume: 0.8,
    isFullPlayerOpen: false,
    queue: MOCK_SONGS,
    showPlaylist: false,
    mode: PlaybackMode.LOOP,
    history: [],
  });

  // Simulating Audio Context
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (playerState.isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setPlayerState((prev) => {
          if (!prev.currentSong) return prev;

          // Auto-switch song logic when song ends
          if (prev.currentTime >= prev.currentSong.duration) {
             let nextIndex = 0;
             const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);

             if (prev.mode === PlaybackMode.SINGLE) {
                 return { ...prev, currentTime: 0 }; // Replay
             } else if (prev.mode === PlaybackMode.SHUFFLE) {
                 nextIndex = Math.floor(Math.random() * prev.queue.length);
             } else {
                 // LOOP
                 nextIndex = (currentIndex + 1) % prev.queue.length;
             }

             const nextSong = prev.queue[nextIndex];
             const newHistory = [prev.currentSong, ...prev.history].filter((s, i) => s.id !== prev.currentSong?.id || i === 0).slice(0, 50);

             return {
                 ...prev,
                 currentSong: nextSong,
                 currentTime: 0,
                 history: newHistory
             };
          }
          return { ...prev, currentTime: prev.currentTime + 1 };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playerState.isPlaying]);

  // Actions
  const togglePlay = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
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
    setPlayerState(prev => ({ ...prev, currentTime: time }));
  };

  const changeVolume = (val: number) => {
    setPlayerState(prev => ({ ...prev, volume: val }));
  };

  const playSong = (song: Song) => {
    setPlayerState(prev => {
        // Add to history if it's a new song
        const newHistory = [song, ...prev.history].filter((s, index, self) =>
            index === self.findIndex((t) => (t.id === s.id))
        ).slice(0, 50);

        return {
            ...prev,
            currentSong: song,
            currentTime: 0,
            isPlaying: true,
            history: newHistory
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
