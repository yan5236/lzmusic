/**
 * SearchView 组件 - Bilibili 音乐搜索视图
 * 通过 Electron IPC 调用主进程的 Bilibili API 进行真实搜索
 */

import { useEffect, useState } from 'react';
import type { Song } from '../types';
import type { BilibiliVideo, BilibiliPage } from '../../shared/types';
import PageSelectDialog from '../components/PageSelectDialog';
import AddToPlaylistDialog from '../components/AddToPlaylistDialog';
import {
  SearchInput,
  SearchHistory,
  SearchResultList,
  SearchLoading,
  SearchError,
  SearchEmptyState,
  useSearch,
  useSearchHistory,
  convertToSong,
} from '../components/Search';

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  playSong: (song: Song) => void;
  onShowToast: (message: string) => void;
}

export default function SearchView({
  searchQuery,
  setSearchQuery,
  playSong,
  onShowToast,
}: SearchViewProps) {
  const { searchHistory, addToHistory, clearHistory } = useSearchHistory();
  const {
    searchResults,
    loading,
    error,
    total,
    hasMore,
    loadingMore,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    performSearch,
    fetchSuggestions,
    observerTarget,
  } = useSearch(addToHistory);

  const [inputFocused, setInputFocused] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<BilibiliVideo | null>(null);
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);

  /**
   * 防抖获取搜索建议
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() && inputFocused) {
        fetchSuggestions(searchQuery);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, inputFocused, fetchSuggestions, setShowSuggestions]);

  /**
   * 防抖搜索
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery, 1, false);
      } else {
        performSearch('', 1, false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  /**
   * 无限滚动
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && searchQuery.trim()) {
          performSearch(searchQuery, 1, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, searchQuery, performSearch, observerTarget]);

  const handlePlay = (video: BilibiliVideo) => {
    if (video.pages && video.pages.length > 1) {
      setSelectedVideo(video);
      setPageDialogOpen(true);
    } else {
      playSong(convertToSong(video));
    }
  };

  const handlePageSelect = (selectedPage: BilibiliPage) => {
    if (selectedVideo) {
      playSong(convertToSong(selectedVideo, selectedPage.cid));
      setSelectedVideo(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleAddToPlaylist = (video: BilibiliVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongToAdd(convertToSong(video));
    setShowAddToPlaylistDialog(true);
  };

  const handleAddSongToPlaylist = async (playlistId: string) => {
    if (!songToAdd) return;

    try {
      const result = await window.electron.invoke(
        'app-db-playlist-add-song',
        playlistId,
        songToAdd
      );

      if (result.success) {
        onShowToast('已添加到歌单');
      } else {
        onShowToast('添加失败');
      }
    } catch (error) {
      console.error('添加到歌单失败:', error);
      onShowToast('添加失败');
    }
  };

  const handleCreatePlaylist = async (name: string, description?: string): Promise<string> => {
    const result = await window.electron.invoke('app-db-playlist-create', name, description);

    if (result.success && result.id) {
      return result.id;
    } else {
      throw new Error('创建歌单失败');
    }
  };

  const handleRetry = () => {
    performSearch(searchQuery, 1, false);
  };

  return (
    <div className="p-8 flex flex-col h-full text-slate-500">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        onSuggestionClick={handleSuggestionClick}
        onFocus={() => setInputFocused(true)}
        onBlur={() => {
          setTimeout(() => {
            setInputFocused(false);
            setShowSuggestions(false);
          }, 200);
        }}
      />

      <SearchHistory
        searchHistory={searchHistory}
        onHistoryClick={(term) => {
          setSearchQuery(term);
          setShowSuggestions(false);
        }}
        onClearHistory={clearHistory}
        shouldShow={!searchQuery.trim()}
      />

      {searchQuery.trim() ? (
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {loading ? (
            <SearchLoading />
          ) : error ? (
            <SearchError error={error} onRetry={handleRetry} />
          ) : searchResults.length > 0 ? (
            <SearchResultList
              videos={searchResults}
              total={total}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onPlay={handlePlay}
              onAddToPlaylist={handleAddToPlaylist}
            />
          ) : (
            <SearchEmptyState hasSearchQuery />
          )}
          <div ref={observerTarget} className="h-4" />
        </div>
      ) : (
        <SearchEmptyState hasSearchQuery={false} />
      )}

      {selectedVideo && (
        <PageSelectDialog
          isOpen={pageDialogOpen}
          onClose={() => {
            setPageDialogOpen(false);
            setSelectedVideo(null);
          }}
          pages={selectedVideo.pages || []}
          onSelect={handlePageSelect}
          videoTitle={selectedVideo.title}
        />
      )}

      <AddToPlaylistDialog
        isOpen={showAddToPlaylistDialog}
        onClose={() => {
          setShowAddToPlaylistDialog(false);
          setSongToAdd(null);
        }}
        song={songToAdd}
        onAddToPlaylist={handleAddSongToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
      />
    </div>
  );
}
