import {
  DndContext,
  closestCenter,
  type SensorDescriptor,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { PlaylistSong, Song } from '../../types';
import SongListHeader from './SongListHeader';
import SortableSongItem from './SortableSongItem';
import EmptyState from './EmptyState';

/**
 * 歌单歌曲列表组件，支持拖拽排序与编辑模式
 */

interface SongListProps {
  songs: PlaylistSong[];
  selectedSongs: Set<string>;
  isEditMode: boolean;
  sensors: SensorDescriptor<object>[];
  onDragEnd: (event: DragEndEvent) => void;
  onToggleSelect: (songId: string) => void;
  onPlaySong: (song: Song) => void;
}

export default function SongList({
  songs,
  selectedSongs,
  isEditMode,
  sensors,
  onDragEnd,
  onToggleSelect,
  onPlaySong,
}: SongListProps) {
  if (songs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="bg-white rounded-2xl m-6 overflow-hidden border border-slate-100 shadow-sm">
      {!isEditMode && <SongListHeader />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={songs.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {songs.map((song, index) => (
            <SortableSongItem
              key={song.id}
              song={song}
              index={index}
              isEditMode={isEditMode}
              isSelected={selectedSongs.has(song.id)}
              onToggleSelect={() => onToggleSelect(song.id)}
              onPlay={() => onPlaySong(song)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
