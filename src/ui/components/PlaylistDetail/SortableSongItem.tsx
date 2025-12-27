import { Play, GripVertical, Music } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlaylistSong } from '../../types';

/**
 * 可拖拽的歌单歌曲行组件
 */

interface SortableSongItemProps {
  song: PlaylistSong;
  index: number;
  isEditMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPlay: () => void;
}

export default function SortableSongItem({
  song,
  index,
  isEditMode,
  isSelected,
  onToggleSelect,
  onPlay,
}: SortableSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number): string => {
    const totalSeconds = Math.round(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const gridClass = isEditMode
    ? 'grid-cols-[auto_auto_auto_1fr_1fr_auto]'
    : 'grid-cols-[auto_1fr_1fr_auto]';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isEditMode && onPlay()}
      className={`grid ${gridClass} gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors ${
        isDragging ? 'bg-primary/10' : ''
      }`}
    >
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={20} />
        </div>
      )}

      {isEditMode && (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary"
          />
        </div>
      )}

      {isEditMode && (
        <div className="w-10 h-10 rounded shadow-sm flex-shrink-0 overflow-hidden">
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Music size={16} className="text-slate-400" />
            </div>
          )}
        </div>
      )}

      {!isEditMode && (
        <div className="flex items-center gap-3">
          <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
            <span className="group-hover:hidden">{index + 1}</span>
            <Play
              size={14}
              fill="currentColor"
              className="hidden group-hover:inline-block mx-auto"
            />
          </div>
          <div className="w-10 h-10 rounded shadow-sm flex-shrink-0 overflow-hidden">
            {song.coverUrl ? (
              <img
                src={song.coverUrl}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Music size={16} className="text-slate-400" />
              </div>
            )}
          </div>
        </div>
      )}

      <span className="text-slate-900 font-medium truncate">{song.title}</span>

      <div className="text-slate-500 text-sm truncate">{song.artist}</div>

      <div className="w-16 text-center text-slate-400 text-sm font-mono">
        {formatDuration(song.duration)}
      </div>
    </div>
  );
}
