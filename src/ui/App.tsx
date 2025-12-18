import { useEffect, useRef, useState } from 'react';
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
import { ViewState } from './types';
import { useToastManager } from './hooks/useToastManager';
import { useThemeColor } from './hooks/useThemeColor';
import { useAgreement } from './hooks/useAgreement';
import { usePlayerController } from './hooks/usePlayerController';
import { notifyPlaylistUpdated } from './utils/playlistEvents';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);

  const { toastMessages, showToast, removeToast } = useToastManager();
  const { themeColor, updateThemeColor } = useThemeColor(showToast);
  const { showAgreement, handleAgreementAccept, handleExitApp } = useAgreement();

  const {
    playerState,
    togglePlay,
    toggleMode,
    nextSong,
    prevSong,
    seek,
    changeVolume,
    playSong,
    toggleFullPlayer,
    togglePlaylist,
    removeFromQueue,
    updateLyricsFontSize,
    updateLyricsOffset,
    updateCurrentSongLyrics,
    updateCoverStyle,
    handlePlayAllFromPlaylist,
    clearHistory,
    deleteHistory,
    setPlayerState,
  } = usePlayerController(showToast);

  // 托盘状态上报节流
  const traySyncRef = useRef<number>(0);
  const lastIsPlayingRef = useRef<boolean>(playerState.isPlaying);
  const lastSongIdRef = useRef<string | null>(playerState.currentSong?.id ?? null);

  useEffect(() => {
    const now = Date.now();
    const songId = playerState.currentSong?.id ?? null;
    const isPlayingChanged = lastIsPlayingRef.current !== playerState.isPlaying;
    const songChanged = lastSongIdRef.current !== songId;

    // 中文注释：避免频繁上报，时间戳小于 700ms 的更新直接跳过
    if (!isPlayingChanged && !songChanged && now - traySyncRef.current < 700 && playerState.currentTime !== 0) {
      return;
    }
    traySyncRef.current = now;
    lastIsPlayingRef.current = playerState.isPlaying;
    lastSongIdRef.current = songId;

    if (typeof window.electron?.send !== 'function') return;

    try {
      window.electron.send('player-state-update', {
        title: playerState.currentSong?.title || '未在播放',
        artist: playerState.currentSong?.artist || '',
        coverUrl: playerState.currentSong?.coverUrl || '',
        isPlaying: playerState.isPlaying,
        duration: playerState.currentSong?.duration || 0,
        currentTime: playerState.currentTime,
      });
    } catch (error) {
      console.error('托盘状态上报失败:', error);
    }
  }, [playerState.currentSong, playerState.isPlaying, playerState.currentTime]);

  useEffect(() => {
    if (typeof window.electron?.onPlayerControl !== 'function') return;

    const stopListen = window.electron.onPlayerControl((action) => {
      switch (action) {
        case 'toggle-play':
          togglePlay();
          break;
        case 'next':
          nextSong();
          break;
        case 'prev':
          prevSong();
          break;
        case 'open-playlist':
          setPlayerState((prev) => (prev.showPlaylist ? prev : { ...prev, showPlaylist: true }));
          break;
        case 'show-main':
        default:
          break;
      }
    });

    return () => {
      stopListen?.();
    };
  }, [nextSong, prevSong, setPlayerState, togglePlay]);

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
            onClearHistory={clearHistory}
            onDeleteHistory={deleteHistory}
            onShowToast={showToast}
          />
        );

      case ViewState.LOCAL:
        return <LocalView onPlaySong={playSong} onShowToast={showToast} />;

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

        <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-secondary">
          <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-4 md:px-6">
            {renderView()}
          </main>

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

      <PlaylistDrawer
        playerState={playerState}
        togglePlaylist={togglePlaylist}
        playSong={playSong}
        removeFromQueue={removeFromQueue}
      />

      <AddToPlaylistDialog
        isOpen={showAddToPlaylistDialog}
        onClose={() => setShowAddToPlaylistDialog(false)}
        song={playerState.currentSong}
        onAddToPlaylist={handleAddSongToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
      />

      <Toast messages={toastMessages} onRemove={removeToast} />

      <AgreementDialog
        open={showAgreement}
        onAccept={handleAgreementAccept}
        onExit={handleExitApp}
      />
    </div>
  );
}

export default App;
