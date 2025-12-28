import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Play, Music, ListMusic, Clock3 } from 'lucide-react';
import type { Song, PlayerState, Playlist, PlaylistSong, LocalTrack } from '../types';
import { subscribePlaylistEvent } from '../utils/playlistEvents';

/**
 * HomeView 组件 - 首页视图
 * 展示单曲推荐、歌单推荐和最近播放列表
 */

interface HomeViewProps {
  playerState: PlayerState;
  playSong: (song: Song) => void;
  onNavigateToPlaylist?: (playlistId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function HomeView({
  playerState,
  playSong,
  onNavigateToPlaylist,
  onShowToast,
}: HomeViewProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recommendedSong, setRecommendedSong] = useState<Song | null>(null);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);

  const playlistSongsCache = useRef<Map<string, Song[]>>(new Map());
  const localSongsCache = useRef<Song[] | null>(null);

  const featuredPlaylist = useMemo(() => {
    if (playlists.length === 0) {
      return null;
    }
    return [...playlists].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  }, [playlists]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60) || 0;
    const secs = Math.floor(seconds % 60) || 0;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const convertPlaylistSong = (song: PlaylistSong): Song => {
    const { sortOrder, addedAt, ...rest } = song;
    void sortOrder;
    void addedAt;
    return rest;
  };

  const convertLocalTrackToSong = (track: LocalTrack): Song => ({
    id: `local_${track.id}`,
    title: track.title,
    artist: track.artist,
    album: track.album,
    coverUrl: track.cover_path
      ? `localmusic://localhost/${encodeURIComponent(track.cover_path.replace(/\\/g, '/'))}`
      : '',
    duration: track.duration,
    source: 'local',
  });

  const loadPlaylists = useCallback(async () => {
    setIsLoadingPlaylists(true);
    try {
      const result = await window.electron.invoke('app-db-playlist-get-all');
      if (result.success) {
        setPlaylists(result.data);
        playlistSongsCache.current.clear(); // 歌单变化时刷新缓存
      } else {
        onShowToast?.('加载歌单失败', 'error');
      }
    } catch (error) {
      console.error('加载歌单失败:', error);
      onShowToast?.('加载歌单失败', 'error');
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, [onShowToast]);

  const loadPlaylistSongs = useCallback(async () => {
    const songs: Song[] = [];
    const targetPlaylists = playlists
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3);

    for (const playlist of targetPlaylists) {
      const cached = playlistSongsCache.current.get(playlist.id);
      if (cached) {
        songs.push(...cached);
        continue;
      }

      try {
        const detail = await window.electron.invoke('app-db-playlist-get-detail', playlist.id);
        if (detail.success && detail.data) {
          const mapped = detail.data.songs.map(convertPlaylistSong);
          playlistSongsCache.current.set(playlist.id, mapped);
          songs.push(...mapped);
        }
      } catch (error) {
        console.error('加载歌单详情失败:', error);
      }
    }

    return songs;
  }, [playlists]);

  const loadLocalSongs = useCallback(async () => {
    if (localSongsCache.current) {
      return localSongsCache.current;
    }

    try {
      const foldersResult = await window.electron.invoke('local-music-get-folders');
      if (foldersResult.success && foldersResult.data && foldersResult.data.length > 0) {
        const targetFolder = [...foldersResult.data].sort((a, b) => b.trackCount - a.trackCount)[0];
        const tracksResult = await window.electron.invoke('local-music-get-tracks', targetFolder.id);
        if (tracksResult.success && tracksResult.data) {
          const songs = tracksResult.data.map(convertLocalTrackToSong);
          localSongsCache.current = songs;
          return songs;
        }
      }
    } catch (error) {
      console.error('加载本地歌曲失败:', error);
    }

    return [];
  }, []);

  const refreshRecommendedSong = useCallback(async () => {
    setIsLoadingRecommended(true);
    try {
      const historySongs = playerState.history;
      const playlistSongs = await loadPlaylistSongs();
      const localSongs = await loadLocalSongs();

      const poolMap = new Map<string, Song>();
      [...historySongs, ...playlistSongs, ...localSongs].forEach(song => {
        if (!poolMap.has(song.id)) {
          poolMap.set(song.id, song);
        }
      });

      const pool = Array.from(poolMap.values());
      if (pool.length === 0) {
        setRecommendedSong(null);
        return;
      }

      const randomIndex = Math.floor(Math.random() * pool.length);
      setRecommendedSong(pool[randomIndex]);
    } catch (error) {
      console.error('生成推荐歌曲失败:', error);
      onShowToast?.('获取推荐歌曲失败', 'error');
    } finally {
      setIsLoadingRecommended(false);
    }
  }, [playerState.history, loadPlaylistSongs, loadLocalSongs, onShowToast]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    const unsubscribe = subscribePlaylistEvent('playlist-updated', () => {
      loadPlaylists();
    });
    return () => unsubscribe();
  }, [loadPlaylists]);

  useEffect(() => {
    refreshRecommendedSong();
  }, [refreshRecommendedSong]);

  return (
    <div className="p-8 space-y-8">
      {/* 单曲推荐 */}
      <div className="bg-primary rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10 cursor-pointer group"
              onClick={() => recommendedSong && playSong(recommendedSong)}
            >
              {recommendedSong?.coverUrl ? (
                <img
                  src={recommendedSong.coverUrl}
                  alt={recommendedSong.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <Music size={42} className="text-white/70" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 rounded-full p-3 shadow-lg">
                  <Play size={18} className="text-primary fill-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.2em] text-white/80">单曲推荐</p>
              <h3 className="text-2xl font-bold drop-shadow-sm">
                {recommendedSong ? recommendedSong.title : '暂无可推荐歌曲'}
              </h3>
              <p className="text-white/80">
                {recommendedSong ? recommendedSong.artist || '未知艺人' : '请先播放或添加音乐'}
              </p>
              {recommendedSong && (
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <Clock3 size={16} />
                    {formatDuration(recommendedSong.duration)}
                  </span>
                  {recommendedSong.album && (
                    <span className="px-2 py-1 bg-white/10 rounded-full text-xs">
                      {recommendedSong.album}
                    </span>
                  )}
                </div>
              )}
              {!recommendedSong && isLoadingRecommended && (
                <p className="text-white/70 text-sm">正在为你挑选...</p>
              )}
            </div>
          </div>

          <button
            className="flex items-center gap-2 px-5 py-3 bg-white text-primary rounded-xl font-semibold shadow-md hover:shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => recommendedSong && playSong(recommendedSong)}
            disabled={!recommendedSong || isLoadingRecommended}
          >
            <Play size={16} className="fill-primary text-primary" />
            {isLoadingRecommended ? '挑选中...' : '立即播放'}
          </button>
        </div>
      </div>

      {/* 歌单推荐 */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <ListMusic size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">歌单推荐</h2>
          <span className="text-slate-400 text-sm">
            {featuredPlaylist ? '1 个精选推荐' : '暂无推荐'}
          </span>
        </div>

        {isLoadingPlaylists ? (
          <div className="text-slate-400">正在加载歌单...</div>
        ) : !featuredPlaylist ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            <p className="font-medium mb-2">还没有歌单</p>
            <p className="text-sm">创建或导入歌单后，这里会展示你的歌单推荐</p>
          </div>
        ) : (
          <div
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer group"
            onClick={() => onNavigateToPlaylist && onNavigateToPlaylist(featuredPlaylist.id)}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6">
              <div className="relative w-full md:w-40 aspect-square flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-white to-primary/10">
                {featuredPlaylist.coverUrl ? (
                  <img
                    src={featuredPlaylist.coverUrl}
                    alt={featuredPlaylist.name}
                    className="w-full h-full object-cover transition-transform duration-300 md:group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Music size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white rounded-full p-3 shadow">
                    <Play size={16} className="text-primary fill-primary" />
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold">
                  今日精选歌单
                </p>
                <h3 className="text-2xl font-bold text-slate-900">{featuredPlaylist.name}</h3>
                <p className="text-sm text-slate-600">
                  {featuredPlaylist.description || '暂无简介，点击查看详情'}
                </p>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-full">
                    <ListMusic size={14} />
                    {featuredPlaylist.songCount} 首歌曲
                  </span>
                  <span className="px-2 py-1 bg-primary/5 text-primary rounded-full text-xs font-semibold">
                    为你推荐
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto">
                <button
                  className="w-full md:w-32 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-semibold shadow-md hover:shadow-lg active:scale-95 transition"
                  onClick={(event) => {
                    event.stopPropagation();
                    onNavigateToPlaylist?.(featuredPlaylist.id);
                  }}
                >
                  <Play size={16} className="fill-white text-white" />
                  去看看
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 最近播放 */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-slate-800">最近播放</h2>
        <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
          {playerState.history.length > 0 ? playerState.history.slice(0, 3).map((song, i) => (
            <div key={`recent-${i}`} className="flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group" onClick={() => playSong(song)}>
              <div className="flex items-center gap-4">
                <span className="text-primary font-mono w-4 text-center opacity-0 group-hover:opacity-100 transition-opacity"><Play size={12} fill="currentColor"/></span>
                {song.coverUrl ? (
                  <img src={song.coverUrl} className="w-10 h-10 rounded shadow-sm object-cover" alt="cover" />
                ) : (
                    <div className="w-10 h-10 rounded shadow-sm bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <Music size={16} className="text-slate-400" />
                  </div>
                )}
                <div>
                  <div className="text-slate-900 font-medium">{song.title}</div>
                  <div className="text-xs text-slate-500">{song.artist}</div>
                </div>
              </div>
              <div className="text-slate-400 text-sm font-mono">{Math.floor(Math.round(song.duration) / 60)}:{(Math.round(song.duration) % 60).toString().padStart(2, '0')}</div>
            </div>
          )) : (
            <div className="p-6 text-center text-slate-400">暂无播放记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
