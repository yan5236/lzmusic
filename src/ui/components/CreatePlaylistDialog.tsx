/**
 * 新建歌单对话框组件
 * 允许用户创建新的歌单
 */

import { useState } from 'react';

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
}

export default function CreatePlaylistDialog({
  isOpen,
  onClose,
  onCreate,
}: CreatePlaylistDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onClose();
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleCreate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">新建歌单</h2>
        </div>

        {/* 表单 */}
        <div className="px-6 py-4 space-y-4">
          {/* 歌单名称 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              歌单名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入歌单名称"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              autoFocus
            />
          </div>

          {/* 歌单描述 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入歌单描述"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className={`px-6 py-2 rounded-lg transition-colors ${
              name.trim()
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
