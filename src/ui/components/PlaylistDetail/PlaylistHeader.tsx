import type { Playlist, PlaylistSong } from '../../types';
import PlaylistCover from './PlaylistCover';
import PlaylistNameEditor from './PlaylistNameEditor';
import PlaylistActions from './PlaylistActions';

/**
 * 歌单详情头部信息区（封面、名称、统计与操作）
 */

interface PlaylistHeaderProps {
  playlist: Playlist;
  songs: PlaylistSong[];
  isEditMode: boolean;
  isEditingName: boolean;
  editedName: string;
  onEditNameToggle: () => void;
  onNameChange: (value: string) => void;
  onSaveName: () => void;
  onCancelName: () => void;
  onPlayAll: () => void;
  onEditModeToggle: () => void;
  onDeletePlaylist: () => void;
}

export default function PlaylistHeader({
  playlist,
  songs,
  isEditMode,
  isEditingName,
  editedName,
  onEditNameToggle,
  onNameChange,
  onSaveName,
  onCancelName,
  onPlayAll,
  onEditModeToggle,
  onDeletePlaylist,
}: PlaylistHeaderProps) {
  const coverUrl = playlist.coverUrl || (songs.length > 0 ? songs[0].coverUrl : undefined);

  return (
    <div className="px-8 py-6">
      <div className="flex gap-6">
        <PlaylistCover coverUrl={coverUrl} alt={playlist.name} />

        <div className="flex-1 flex flex-col justify-center">
          <div className="group">
            <PlaylistNameEditor
              isEditing={isEditingName}
              name={playlist.name}
              editedName={editedName}
              isEditMode={isEditMode}
              onEditToggle={onEditNameToggle}
              onNameChange={onNameChange}
              onSave={onSaveName}
              onCancel={onCancelName}
            />
          </div>

          <div className="text-slate-600 mb-6">
            <span>{songs.length} 首歌曲</span>
            {playlist.createdAt && (
              <>
                <span className="mx-2">·</span>
                <span>
                  创建于 {new Date(playlist.createdAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>

          <PlaylistActions
            songCount={songs.length}
            isEditMode={isEditMode}
            onPlayAll={onPlayAll}
            onEditModeToggle={onEditModeToggle}
            onDeletePlaylist={onDeletePlaylist}
          />
        </div>
      </div>
    </div>
  );
}
