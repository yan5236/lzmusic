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
  isEditingDescription: boolean;
  editedDescription: string;
  onDescriptionChange: (value: string) => void;
  onSaveDescription: () => void;
  onCancelDescription: () => void;
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
  isEditingDescription,
  editedDescription,
  onDescriptionChange,
  onSaveDescription,
  onCancelDescription,
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

          <div className="text-slate-500 text-sm mt-2 line-clamp-2">
            {isEditingDescription ? (
              <div className="flex items-start gap-2">
                <textarea
                  value={editedDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  className="flex-1 text-sm text-slate-700 border-b-2 border-primary outline-none bg-transparent px-2 py-1 resize-none min-h-[60px]"
                  placeholder="请输入歌单简介"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSaveDescription();
                    }
                  }}
                />
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={onSaveDescription}
                    className="p-1 text-green-600 hover:bg-green-50 rounded-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button
                    onClick={onCancelDescription}
                    className="p-1 text-slate-600 hover:bg-slate-100 rounded-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              playlist.description || '暂无简介'
            )}
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
