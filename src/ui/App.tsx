import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import BottomPlayer from './components/BottomPlayer';
import FullPlayer from './components/FullPlayer';
import type { Song, PlayerState } from './types';
import { ViewState, PlaybackMode } from './types';
import { MOCK_SONGS } from './constants';
import { Play, Settings, History, } from 'lucide-react';

function App() {
  // Application State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);

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

  // View Rendering Helper
  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME:
        return (
          <div className="p-8 space-y-8">
            {/* Quick Picks */}
            <div>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">每日推荐</h2>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {MOCK_SONGS.map((song) => (
                        <div
                            key={song.id}
                            className="bg-white p-4 rounded-xl hover:shadow-xl shadow-sm border border-slate-100 transition-all group cursor-pointer"
                            onClick={() => playSong(song)}
                        >
                            <div className="relative aspect-square mb-4 overflow-hidden rounded-lg shadow-md">
                                <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-primary p-3 rounded-full shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <Play fill="white" size={20} className="text-white"/>
                                    </div>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-900 truncate">{song.title}</h3>
                            <p className="text-sm text-slate-500 truncate">{song.artist}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recently Played Row (Mock) */}
            <div>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">最近播放</h2>
                 <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                     {playerState.history.length > 0 ? playerState.history.slice(0, 3).map((song, i) => (
                         <div key={`recent-${i}`} className="flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group" onClick={() => playSong(song)}>
                             <div className="flex items-center gap-4">
                                 <span className="text-primary font-mono w-4 text-center opacity-0 group-hover:opacity-100 transition-opacity"><Play size={12} fill="currentColor"/></span>
                                 <img src={song.coverUrl} className="w-10 h-10 rounded shadow-sm" alt="cover" />
                                 <div>
                                     <div className="text-slate-900 font-medium">{song.title}</div>
                                     <div className="text-xs text-slate-500">{song.artist}</div>
                                 </div>
                             </div>
                             <div className="text-slate-400 text-sm font-mono">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</div>
                         </div>
                     )) : (
                        <div className="p-6 text-center text-slate-400">暂无播放记录</div>
                     )}
                 </div>
            </div>
          </div>
        );
      case ViewState.SEARCH:
        return (
          <div className="p-8 flex flex-col h-full text-slate-500">
            <div className="w-full max-w-4xl mx-auto mb-10 pt-4">
                <input
                    type="text"
                    placeholder="搜索歌曲、歌手、歌词..."
                    className="w-full bg-white border border-slate-200 rounded-full py-4 px-6 text-slate-900 text-lg focus:ring-2 focus:ring-primary focus:outline-none shadow-lg placeholder:text-slate-400"
                    autoFocus
                />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
                <SearchIconPlaceholder />
                <p className="text-lg mt-4">输入关键词开始搜索...</p>
            </div>
          </div>
        );
      case ViewState.HISTORY:
        return (
            <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-blue-100 rounded-xl text-primary">
                        <History size={24} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">历史播放</h1>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
                        <div className="w-10 text-center">#</div>
                        <div>标题</div>
                        <div>歌手</div>
                        <div className="w-16 text-center">时长</div>
                    </div>
                    {playerState.history.length > 0 ? playerState.history.map((song, i) => (
                         <div key={`history-${i}`} className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors" onClick={() => playSong(song)}>
                             <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
                                 <span className="group-hover:hidden">{i + 1}</span>
                                 <Play size={14} className="hidden group-hover:inline-block mx-auto" fill="currentColor"/>
                             </div>
                             <div className="flex items-center gap-3">
                                 <img src={song.coverUrl} className="w-10 h-10 rounded shadow-sm" alt={song.title}/>
                                 <span className="text-slate-900 font-medium">{song.title}</span>
                             </div>
                             <div className="text-slate-500 text-sm">{song.artist}</div>
                             <div className="w-16 text-center text-slate-400 text-sm font-mono">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</div>
                         </div>
                    )) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <History size={48} className="mb-4 opacity-20"/>
                            <p>暂无历史播放记录</p>
                        </div>
                    )}
                </div>
            </div>
        );
      default:
        return (
          <div className="p-8 flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-primary">
                <Settings size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">施工中</h2>
            <p>该功能 ({currentView}) 正在开发中。</p>
          </div>
        );
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
      <div className={`fixed top-0 right-0 h-[calc(100vh-6rem)] w-80 bg-white border-l border-slate-200 transform transition-transform duration-300 z-30 shadow-2xl ${playerState.showPlaylist ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-slate-200 font-bold text-lg flex justify-between items-center text-slate-800">
              <span>播放列表</span>
              <button onClick={togglePlaylist} className="text-xs text-slate-400 hover:text-primary">关闭</button>
          </div>
          <div className="p-2 overflow-y-auto h-full pb-20">
              {playerState.queue.map((song, idx) => (
                  <div
                    key={`queue-${idx}`}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-slate-50 ${playerState.currentSong?.id === song.id ? 'bg-blue-50 border border-blue-100' : ''}`}
                    onClick={() => playSong(song)}
                  >
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <img src={song.coverUrl} className="w-full h-full object-cover rounded shadow-sm" alt="art"/>
                        {playerState.currentSong?.id === song.id && playerState.isPlaying ? (
                             <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded">
                                 <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-sm"></div>
                             </div>
                        ) : playerState.currentSong?.id === song.id && (
                             <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded">
                                 <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-1"></div>
                             </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${playerState.currentSong?.id === song.id ? 'text-primary' : 'text-slate-800'}`}>{song.title}</div>
                          <div className="text-xs text-slate-500 truncate">{song.artist}</div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}

const SearchIconPlaceholder = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

export default App;
