import { useState, useRef, useCallback } from 'react';
import type { BilibiliVideo, SearchResult } from '../../../shared/types';

/**
 * 搜索逻辑 Hook
 */
export function useSearch(addToHistory: (keyword: string) => void) {
  const [searchResults, setSearchResults] = useState<BilibiliVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentPage = useRef(1);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  /**
   * 执行搜索
   */
  const performSearch = useCallback(
    async (keyword: string, pageNum: number, isLoadMore = false) => {
      const trimmedKeyword = keyword.trim();

      if (!trimmedKeyword) {
        setSearchResults([]);
        setTotal(0);
        setHasMore(true);
        return;
      }

      if (!isLoadMore) {
        addToHistory(trimmedKeyword);
      }

      try {
        if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setError(null);
        }

        const result: SearchResult = await window.electron.invoke(
          'search-videos',
          trimmedKeyword,
          pageNum
        );

        const detailedVideos = await Promise.all(
          result.videos.map(async (video) => {
            try {
              const videoInfo: BilibiliVideo = await window.electron.invoke(
                'get-video-info',
                video.bvid
              );
              return {
                ...video,
                cid: videoInfo.cid,
                pages: videoInfo.pages,
              };
            } catch (err) {
              console.error(`获取视频 ${video.bvid} 详情失败:`, err);
              return video;
            }
          })
        );

        if (isLoadMore) {
          setSearchResults((prev) => [...prev, ...detailedVideos]);
        } else {
          setSearchResults(detailedVideos);
        }

        setTotal(result.total);
        currentPage.current = pageNum;

        const maxPages = Math.ceil(Math.min(result.total, 1000) / result.pageSize);
        setHasMore(pageNum < maxPages);
      } catch (err) {
        console.error('搜索失败:', err);
        setError(err instanceof Error ? err.message : '搜索失败,请稍后重试');
        if (!isLoadMore) {
          setSearchResults([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [addToHistory]
  );

  /**
   * 获取搜索建议
   */
  const fetchSuggestions = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const results: string[] = await window.electron.invoke('get-search-suggestions', term.trim());
      setSuggestions(results);
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      setSuggestions([]);
    }
  }, []);

  return {
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
  };
}
