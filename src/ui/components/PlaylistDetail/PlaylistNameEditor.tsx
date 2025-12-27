import { Edit2, Check, X } from 'lucide-react';

/**
 * 歌单名称的编辑展示组件
 */

interface PlaylistNameEditorProps {
  isEditing: boolean;
  name: string;
  editedName: string;
  isEditMode: boolean;
  onEditToggle: () => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function PlaylistNameEditor({
  isEditing,
  name,
  editedName,
  isEditMode,
  onEditToggle,
  onNameChange,
  onSave,
  onCancel,
}: PlaylistNameEditorProps) {
  return (
    <div className="mb-4">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editedName}
            onChange={(e) => onNameChange(e.target.value)}
            className="text-3xl font-bold text-slate-800 border-b-2 border-primary outline-none bg-transparent px-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
            }}
            placeholder="请输入歌单名称"
          />
          {!isEditMode && (
            <>
              <button
                onClick={onSave}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full"
              >
                <Check size={20} />
              </button>
              <button
                onClick={onCancel}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-800">{name}</h1>
          <button
            onClick={onEditToggle}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
