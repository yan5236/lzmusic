/**
 * SearchView 组件 - Bilibili 音乐搜索视图
 * 通过 Electron IPC 调用主进程的 Bilibili API 进行真实搜索
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2 } from 'lucide-react';
import type { Song } from '../types';
import type { BilibiliVideo, SearchResult, BilibiliPage } from '../../shared/types';
import PageSelectDialog from '../components/PageSelectDialog';

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  playSong: (song: Song) => void;
}

// 搜索图标占位符组件
const SearchIconPlaceholder = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-slate-200"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

/**
 * 解析时长字符串或数字为秒数
 */
function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration;
  }

  // 解析 "4:18" 或 "1:23:45" 格式
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * 格式化时长为 "分:秒" 格式
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 转换 Bilibili 视频为 Song 格式
 */
function convertToSong(video: BilibiliVideo, selectedCid?: number): Song {
  return {
    id: video.bvid,
    title: video.title,
    artist: video.author,
    coverUrl: video.cover,
    duration: parseDuration(video.duration),
    bvid: video.bvid,
    cid: selectedCid || video.cid,
    pages: video.pages,
    source: 'bilibili',
  };
}

export default function SearchView({ searchQuery, setSearchQuery, playSong }: SearchViewProps) {
  const [searchResults, setSearchResults] = useState<BilibiliVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 搜索建议相关状态
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // 分P选择对话框状态
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<BilibiliVideo | null>(null);

  // 无限滚动监听
  const observerTarget = useRef<HTMLDivElement>(null);

  /**
   * 执行搜索
   */
  const performSearch = useCallback(
    async (keyword: string, pageNum: number, isLoadMore = false) => {
      if (!keyword.trim()) {
        setSearchResults([]);
        setTotal(0);
        setHasMore(true);
        return;
      }

      try {
        if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setError(null);
        }

        // 通过 IPC 调用主进程 API
        const result: SearchResult = await window.electron.invoke(
          'search-videos',
          keyword.trim(),
          pageNum
        );

        // 获取每个视频的详细信息(包含 cid 和分P信息)
        const detailedVideos = await Promise.all(
          result.videos.map(async (video) => {
            try {
              const videoInfo: BilibiliVideo = await window.electron.invoke(
                'get-video-info',
                video.bvid
              );
              // 合并搜索结果和详细信息
              return {
                ...video,
                cid: videoInfo.cid,
                pages: videoInfo.pages,
              };
            } catch (err) {
              console.error(`获取视频 ${video.bvid} 详情失败:`, err);
              // 失败时返回原始数据
              return video;
            }
          })
        );

        if (isLoadMore) {
          // 加载更多时追加结果
          setSearchResults((prev) => [...prev, ...detailedVideos]);
        } else {
          // 新搜索时替换结果
          setSearchResults(detailedVideos);
        }

        setTotal(result.total);
        setPage(pageNum);

        // 检查是否还有更多结果
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
    []
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

  /**
   * 防抖获取搜索建议 - 输入变化时触发
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() && inputFocused) {
        fetchSuggestions(searchQuery);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, inputFocused, fetchSuggestions]);

  /**
   * 防抖搜索 - 输入变化时触发
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setPage(1);
        performSearch(searchQuery, 1, false);
      } else {
        setSearchResults([]);
        setTotal(0);
        setHasMore(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  /**
   * 无限滚动 - 滚动到底部加载更多
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && searchQuery.trim()) {
          performSearch(searchQuery, page + 1, true);
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
  }, [hasMore, loading, loadingMore, searchQuery, page, performSearch]);

  /**
   * 处理播放按钮点击
   */
  const handlePlay = (video: BilibiliVideo) => {
    // 检查是否有多个分P
    if (video.pages && video.pages.length > 1) {
      // 有多个分P,弹出选择对话框
      setSelectedVideo(video);
      setPageDialogOpen(true);
    } else {
      // 只有一个分P,直接播放
      playSong(convertToSong(video));
    }
  };

  /**
   * 处理分P选择
   */
  const handlePageSelect = (selectedPage: BilibiliPage) => {
    if (selectedVideo) {
      playSong(convertToSong(selectedVideo, selectedPage.cid));
      setSelectedVideo(null);
    }
  };

  /**
   * 处理搜索建议点击
   */
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="p-8 flex flex-col h-full text-slate-500">
      {/* 搜索输入框 */}
      <div className="w-full max-w-4xl mx-auto mb-10 pt-4 relative">
        <input
          type="text"
          placeholder="搜索B站音乐视频..."
          className="w-full bg-white border border-slate-200 rounded-full py-4 px-6 text-slate-900 text-lg focus:ring-2 focus:ring-primary focus:outline-none shadow-lg placeholder:text-slate-400"
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => {
            // 延迟隐藏,以便点击建议时能够响应
            setTimeout(() => {
              setInputFocused(false);
              setShowSuggestions(false);
            }, 200);
          }}
        />

        {/* 搜索建议列表 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-6 py-3 hover:bg-slate-50 cursor-pointer transition-colors text-slate-700 border-b border-slate-100 last:border-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 搜索结果显示区域 */}
      {searchQuery.trim() ? (
        <div className="flex-1 overflow-y-auto">
          {/* 加载状态 */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={48} className="text-primary animate-spin" />
              <p className="text-lg mt-4">正在搜索...</p>
            </div>
          ) : error ? (
            /* 错误提示 */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-red-500 text-lg mb-2">搜索失败</div>
              <p className="text-sm text-slate-400">{error}</p>
              <button
                onClick={() => performSearch(searchQuery, 1, false)}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                重试
              </button>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-6">
              {/* 搜索结果统计 */}
              <div className="text-slate-600">
                找到 <span className="font-bold text-primary">{total}</span> 个结果
              </div>

              {/* 视频列表 */}
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
                  <div className="w-10 text-center">#</div>
                  <div>标题</div>
                  <div>UP主</div>
                  <div className="w-16 text-center">时长</div>
                </div>
                {searchResults.map((video, i) => (
                  <div
                    key={`${video.bvid}-${i}`}
                    className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors"
                    onClick={() => handlePlay(video)}
                  >
                    <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
                      <span className="group-hover:hidden">{i + 1}</span>
                      <Play
                        size={14}
                        className="hidden group-hover:inline-block mx-auto"
                        fill="currentColor"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <img
                        src={video.cover}
                        className="w-10 h-10 rounded shadow-sm object-cover"
                        alt={video.title}
                      />
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-medium">{video.title}</span>
                        {video.pages && video.pages.length > 1 && (
                          <span className="text-xs text-slate-400">共{video.pages.length}P</span>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-500 text-sm">{video.author}</div>
                    <div className="w-16 text-center text-slate-400 text-sm font-mono">
                      {formatDuration(parseDuration(video.duration))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 加载更多指示器 */}
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={24} className="text-primary animate-spin mr-2" />
                  <span className="text-slate-500">加载中...</span>
                </div>
              )}

              {/* 无限滚动触发器 */}
              <div ref={observerTarget} className="h-4" />

              {/* 没有更多结果提示 */}
              {!hasMore && (
                <div className="text-center text-slate-400 py-4">没有更多结果了</div>
              )}
            </div>
          ) : (
            /* 无结果提示 */
            <div className="flex-1 flex flex-col items-center justify-center">
              <SearchIconPlaceholder />
              <p className="text-lg mt-4">未找到相关结果</p>
              <p className="text-sm text-slate-400 mt-2">试试其他关键词吧</p>
            </div>
          )}
        </div>
      ) : (
        /* 空状态 - 未输入搜索词 */
        <div className="flex-1 flex flex-col items-center justify-center">
          <SearchIconPlaceholder />
          <p className="text-lg mt-4">输入关键词开始搜索...</p>
        </div>
      )}

      {/* 分P选择对话框 */}
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
    </div>
  );
}
