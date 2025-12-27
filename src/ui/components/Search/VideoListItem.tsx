import { Play, ListPlus } from 'lucide-react';
import { parseDuration, formatDuration } from './utils';
import type { BilibiliVideo } from '../../../shared/types';

/**
 * 视频列表项组件
 */
interface VideoListItemProps {
  video: BilibiliVideo;
  index: number;
  onPlay: (video: BilibiliVideo) => void;
  onAddToPlaylist: (video: BilibiliVideo, e: React.MouseEvent) => void;
}

export default function VideoListItem({
  video,
  index,
  onPlay,
  onAddToPlaylist,
}: VideoListItemProps) {
  const hasMultiplePages = video.pages && video.pages.length > 1;

  return (
    <div
      className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors"
      onClick={() => onPlay(video)}
    >
      <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
        <span className="group-hover:hidden">{index + 1}</span>
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
          {hasMultiplePages && (
            <span className="text-xs text-slate-400">共{video.pages?.length}P</span>
          )}
        </div>
      </div>
      <div className="text-slate-500 text-sm">{video.author}</div>
      <div className="w-16 text-center text-slate-400 text-sm font-mono">
        {formatDuration(parseDuration(video.duration))}
      </div>
      <div className="w-16 text-center">
        <button
          onClick={(e) => onAddToPlaylist(video, e)}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
          title="添加到歌单"
        >
          <ListPlus size={18} className="text-slate-600" />
        </button>
      </div>
    </div>
  );
}
