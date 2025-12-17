import { useCallback, useEffect, useRef, useState } from 'react';
import type { Song, PlayerState } from '../types';
import { PlaybackMode } from '../types';
import { useAudioPlayer } from './useAudioPlayer';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;

export function usePlayerController(showToast: ToastFn) {
  const savedCoverStyle = localStorage.getItem('coverStyle') as 'normal' | 'vinyl' | null;

  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentSong: null,
    currentTime: 0,
    volume: 0.8,
    isFullPlayerOpen: false,
    queue: [],
    showPlaylist: false,
    mode: PlaybackMode.LOOP,
    history: [],
    lyricsFontSize: 18,
    lyricsOffset: 0,
    coverStyle: savedCoverStyle || 'normal',
  });

  const prevSongIdRef = useRef<string | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof useAudioPlayer> | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const result = await window.electron.invoke('app-db-history-get');
        if (result.success && result.data && result.data.length > 0) {
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
          setPlayerState((prev) => ({ ...prev, history: historySongs }));
          console.log(`已从数据库加载 ${historySongs.length} 条历史记录`);
        }
      } catch (error) {
        console.error('加载历史记录失败:', error);
      }
    };

    loadHistory();
  }, []);

  const handleAutoNextSong = useCallback(() => {
    setPlayerState((prev) => {
      if (!prev.currentSong || prev.queue.length === 0) {
        return { ...prev, isPlaying: false };
      }

      let nextIndex = 0;
      const currentIndex = prev.queue.findIndex((s) => s.id === prev.currentSong?.id);

      if (prev.mode === PlaybackMode.SINGLE) {
        return prev;
      } else if (prev.mode === PlaybackMode.SHUFFLE) {
        nextIndex = Math.floor(Math.random() * prev.queue.length);
      } else {
        nextIndex = (currentIndex + 1) % prev.queue.length;
      }

      const nextSong = prev.queue[nextIndex];

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

  const handlePlayStateChange = useCallback((isPlaying: boolean) => {
    setPlayerState((prev) => ({ ...prev, isPlaying }));
  }, []);

  const handleTimeUpdate = useCallback((currentTime: number) => {
    setPlayerState((prev) => ({ ...prev, currentTime }));
  }, []);

  const handleEnded = useCallback(() => {
    setPlayerState((prev) => {
      if (prev.mode === PlaybackMode.SINGLE) {
        if (prev.currentSong && audioPlayerRef.current) {
          setTimeout(() => {
            if (prev.currentSong && audioPlayerRef.current) {
              audioPlayerRef.current.loadAndPlay(prev.currentSong);
            }
          }, 0);
        }
        return prev;
      }

      if (!prev.currentSong || prev.queue.length === 0) {
        return { ...prev, isPlaying: false };
      }

      let nextIndex = 0;
      const currentIndex = prev.queue.findIndex((s) => s.id === prev.currentSong?.id);

      if (prev.mode === PlaybackMode.SHUFFLE) {
        nextIndex = Math.floor(Math.random() * prev.queue.length);
      } else {
        nextIndex = (currentIndex + 1) % prev.queue.length;
      }

      const nextSong = prev.queue[nextIndex];

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

  const handleError = useCallback(
    (error: Error) => {
      console.error('音频播放错误:', error);
      showToast(error.message || '音频播放失败', 'error');
      handleAutoNextSong();
    },
    [handleAutoNextSong, showToast]
  );

  const handleVolumeChange = useCallback((volume: number) => {
    setPlayerState((prev) => ({ ...prev, volume }));
  }, []);

  const handleDurationChange = useCallback((duration: number) => {
    setPlayerState((prev) => {
      if (!prev.currentSong) return prev;
      if (Math.abs(prev.currentSong.duration - duration) > 0.5) {
        return {
          ...prev,
          currentSong: {
            ...prev.currentSong,
            duration: duration,
          },
        };
      }
      return prev;
    });
  }, []);

  const audioPlayer = useAudioPlayer({
    onPlayStateChange: handlePlayStateChange,
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
    onError: handleError,
    onVolumeChange: handleVolumeChange,
    onDurationChange: handleDurationChange,
  });

  useEffect(() => {
    audioPlayerRef.current = audioPlayer;
  });

  useEffect(() => {
    const currentSong = playerState.currentSong;
    const currentSongId = currentSong?.id || null;

    if (currentSong && currentSongId !== prevSongIdRef.current) {
      prevSongIdRef.current = currentSongId;

      if (audioPlayerRef.current) {
        audioPlayerRef.current.loadAndPlay(currentSong);
      }

      const loadLyricsFromDb = async () => {
        try {
          const songId = currentSong.bvid || currentSong.id;
          const result = await window.electron.invoke('lyrics-db-get', songId);

          if (result.success && result.data) {
            setPlayerState((prev) => {
              if (!prev.currentSong || prev.currentSong.id !== currentSong.id) {
                return prev;
              }
              return {
                ...prev,
                currentSong: {
                  ...prev.currentSong,
                  lyrics: result.data || undefined,
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

      const loadLyricsOffset = async () => {
        try {
          const songId = currentSong.bvid || currentSong.id;
          const result = await window.electron.invoke('app-db-offset-get', songId);

          if (result.success) {
            setPlayerState((prev) => {
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
  }, [playerState.currentSong]);

  const togglePlay = useCallback(() => {
    audioPlayer.togglePlay();
  }, [audioPlayer]);

  const toggleMode = useCallback(() => {
    setPlayerState((prev) => {
      const modes = [PlaybackMode.LOOP, PlaybackMode.SINGLE, PlaybackMode.SHUFFLE];
      const nextIndex = (modes.indexOf(prev.mode) + 1) % modes.length;
      return { ...prev, mode: modes[nextIndex] };
    });
  }, []);

  const nextSong = useCallback(() => {
    setPlayerState((prev) => {
      if (!prev.currentSong) return prev;

      let nextIndex;
      if (prev.mode === PlaybackMode.SHUFFLE) {
        nextIndex = Math.floor(Math.random() * prev.queue.length);
      } else {
        const currentIndex = prev.queue.findIndex((s) => s.id === prev.currentSong?.id);
        nextIndex = (currentIndex + 1) % prev.queue.length;
      }

      const newHistory = prev.currentSong
        ? [prev.currentSong, ...prev.history].filter((s) => s.id !== prev.currentSong?.id).slice(0, 50)
        : prev.history;

      return {
        ...prev,
        currentSong: prev.queue[nextIndex],
        currentTime: 0,
        isPlaying: true,
        history: newHistory,
      };
    });
  }, []);

  const prevSong = useCallback(() => {
    setPlayerState((prev) => {
      if (!prev.currentSong) return prev;

      let prevIndex;
      if (prev.mode === PlaybackMode.SHUFFLE) {
        prevIndex = Math.floor(Math.random() * prev.queue.length);
      } else {
        const currentIndex = prev.queue.findIndex((s) => s.id === prev.currentSong?.id);
        prevIndex = (currentIndex - 1 + prev.queue.length) % prev.queue.length;
      }

      return {
        ...prev,
        currentSong: prev.queue[prevIndex],
        currentTime: 0,
        isPlaying: true,
      };
    });
  }, []);

  const seek = useCallback(
    (time: number) => {
      audioPlayer.seek(time);
      setPlayerState((prev) => ({ ...prev, currentTime: time }));
    },
    [audioPlayer]
  );

  const changeVolume = useCallback(
    (val: number) => {
      audioPlayer.setVolume(val);
      setPlayerState((prev) => ({ ...prev, volume: val }));
    },
    [audioPlayer]
  );

  const playSong = useCallback(
    (song: Song) => {
      const currentAudioSong = audioPlayerRef.current?.getCurrentSong();
      const isSameSong = currentAudioSong?.id === song.id;

      if (isSameSong) {
        const playState = audioPlayerRef.current?.getPlayState();
        const hasAudioSrc = playState && playState.duration > 0;

        if (hasAudioSrc) {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.seek(0);
            audioPlayerRef.current.play();
          }
          setPlayerState((prev) => ({
            ...prev,
            currentSong: song,
            currentTime: 0,
            isPlaying: true,
          }));
        } else {
          prevSongIdRef.current = null;

          setPlayerState((prev) => {
            const isInQueue = prev.queue.some((s) => s.id === song.id);
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

      setPlayerState((prev) => {
        const newHistory = [song, ...prev.history]
          .filter((s, index, self) => index === self.findIndex((t) => t.id === s.id))
          .slice(0, 50);

        const isInQueue = prev.queue.some((s) => s.id === song.id);
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
    },
    []
  );

  const toggleFullPlayer = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isFullPlayerOpen: !prev.isFullPlayerOpen }));
  }, []);

  const togglePlaylist = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, showPlaylist: !prev.showPlaylist }));
  }, []);

  const removeFromQueue = useCallback((songId: string) => {
    const isRemovingCurrentSong = playerState.currentSong?.id === songId;

    if (isRemovingCurrentSong && audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }

    setPlayerState((prev) => {
      const newQueue = prev.queue.filter((s) => s.id !== songId);

      if (prev.currentSong?.id === songId) {
        if (newQueue.length === 0) {
          return {
            ...prev,
            queue: newQueue,
            currentSong: null,
            isPlaying: false,
            currentTime: 0,
          };
        } else {
          const currentIndex = prev.queue.findIndex((s) => s.id === songId);
          const nextIndex = currentIndex >= newQueue.length ? 0 : currentIndex;
          return {
            ...prev,
            queue: newQueue,
            currentSong: newQueue[nextIndex],
            currentTime: 0,
          };
        }
      }

      return { ...prev, queue: newQueue };
    });
  }, [playerState.currentSong?.id]);

  const updateLyricsFontSize = useCallback((size: number) => {
    setPlayerState((prev) => ({ ...prev, lyricsFontSize: size }));
  }, []);

  const updateLyricsOffset = useCallback(
    async (offset: number) => {
      setPlayerState((prev) => ({ ...prev, lyricsOffset: offset }));

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
    },
    [playerState.currentSong]
  );

  const updateCurrentSongLyrics = useCallback((lyrics: string[]) => {
    setPlayerState((prev) => {
      if (!prev.currentSong) return prev;
      return {
        ...prev,
        currentSong: {
          ...prev.currentSong,
          lyrics,
        },
      };
    });
  }, []);

  const updateCoverStyle = useCallback((style: 'normal' | 'vinyl') => {
    localStorage.setItem('coverStyle', style);
    setPlayerState((prev) => ({ ...prev, coverStyle: style }));
  }, []);

  const handlePlayAllFromPlaylist = useCallback(
    (songs: Song[]) => {
      if (songs.length > 0) {
        setPlayerState((prev) => ({
          ...prev,
          queue: songs,
        }));
        playSong(songs[0]);
      }
    },
    [playSong]
  );

  const clearHistory = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, history: [] }));
  }, []);

  const deleteHistory = useCallback((songId: string) => {
    setPlayerState((prev) => ({
      ...prev,
      history: prev.history.filter((s) => s.id !== songId),
    }));
  }, []);

  return {
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
  };
}
