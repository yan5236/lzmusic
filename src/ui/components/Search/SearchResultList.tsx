import VideoListItem from './VideoListItem';
import type { BilibiliVideo } from '../../../shared/types';

/**
 * 搜索结果列表组件
 */
interface SearchResultListProps {
  videos: BilibiliVideo[];
  total: number;
  loadingMore: boolean;
  hasMore: boolean;
  onPlay: (video: BilibiliVideo) => void;
  onAddToPlaylist: (video: BilibiliVideo, e: React.MouseEvent) => void;
}

export default function SearchResultList({
  videos,
  total,
  loadingMore,
  hasMore,
  onPlay,
  onAddToPlaylist,
}: SearchResultListProps) {
  return (
    <div className="space-y-6">
      <div className="text-slate-600">
        找到 <span className="font-bold text-primary">{total}</span> 个结果
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
            <div className="w-10 text-center">#</div>
            <div>标题</div>
            <div>UP主</div>
            <div className="w-16 text-center">时长</div>
            <div className="w-16 text-center">操作</div>
          </div>
          {videos.map((video, index) => (
            <VideoListItem
              key={`${video.bvid}-${index}`}
              video={video}
              index={index}
              onPlay={onPlay}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      </div>

      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="text-primary animate-spin mr-2" role="status">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <span className="text-slate-500">加载中...</span>
        </div>
      )}

      {!hasMore && (
        <div className="text-center text-slate-400 py-4">没有更多结果了</div>
      )}
    </div>
  );
}
