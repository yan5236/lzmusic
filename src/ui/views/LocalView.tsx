/**
 * LocalView 组件 - 本地音乐视图
 * 支持虚拟文件夹管理和本地歌曲播放
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Folder,
  Plus,
  FolderPlus,
  Music,
  ArrowLeft,
  Trash2,
  Edit2,
  ListPlus,
} from 'lucide-react';
import type { Song, LocalFolder, LocalTrack } from '../types';
import { Dialog, DialogInput, DialogButton } from '../components/Dialog';
import AddToPlaylistDialog from '../components/AddToPlaylistDialog';

interface LocalViewProps {
  onPlaySong: (song: Song) => void;
  onShowToast: (message: string) => void;
}

// 视图模式
type ViewMode = 'folders' | 'tracks';

const LocalView = memo(function LocalView({ onPlaySong, onShowToast }: LocalViewProps) {
  // 视图状态
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<LocalFolder | null>(null);
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog 状态
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false);
  const [folderToRename, setFolderToRename] = useState<LocalFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  // 删除确认对话框状态
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<LocalFolder | null>(null);
  const [showDeleteTrackDialog, setShowDeleteTrackDialog] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<LocalTrack | null>(null);

  // 添加到歌单对话框状态
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);

  // 使用 ref 存储回调函数
  const onPlaySongRef = useRef(onPlaySong);
  const onShowToastRef = useRef(onShowToast);

  // 保持 ref 最新
  useEffect(() => {
    onPlaySongRef.current = onPlaySong;
    onShowToastRef.current = onShowToast;
  });

  // 加载文件夹列表
  const loadFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.invoke('local-music-get-folders');
      if (result.success) {
        setFolders(result.data ?? []);
      } else {
        onShowToastRef.current('加载文件夹失败');
      }
    } catch (error) {
      console.error('加载文件夹失败:', error);
      onShowToastRef.current('加载文件夹失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载指定文件夹的歌曲
  const loadTracks = useCallback(async (folderId: string) => {
    setIsLoading(true);
    try {
      const result = await window.electron.invoke('local-music-get-tracks', folderId);
      if (result.success) {
        setTracks(result.data ?? []);
      } else {
        onShowToastRef.current('加载歌曲失败');
      }
    } catch (error) {
      console.error('加载歌曲失败:', error);
      onShowToastRef.current('加载歌曲失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载文件夹列表
  useEffect(() => {
    if (viewMode === 'folders') {
      loadFolders();
    }
  }, [viewMode, loadFolders]);

  // 创建空虚拟文件夹
  const handleCreateEmptyFolder = async () => {
    if (!newFolderName.trim()) {
      onShowToastRef.current('请输入文件夹名称');
      return;
    }

    try {
      const result = await window.electron.invoke('local-music-create-folder', newFolderName.trim());
      if (result.success) {
        onShowToastRef.current('文件夹创建成功');
        setShowCreateFolderDialog(false);
        setNewFolderName('');
        loadFolders();
      } else {
        onShowToastRef.current('创建文件夹失败');
      }
    } catch (error) {
      console.error('创建文件夹失败:', error);
      onShowToastRef.current('创建文件夹失败');
    }
  };

  // 导入本机目录
  const handleImportFolder = async () => {
    try {
      const result = await window.electron.invoke('local-music-select-folder');
      if (result.canceled || !result.folderPath) {
        return;
      }

      onShowToastRef.current('正在扫描文件夹...');
      const scanResult = await window.electron.invoke('local-music-scan-folder', result.folderPath);

      if (scanResult.success) {
        onShowToastRef.current(
          `导入完成！成功: ${scanResult.successCount}, 失败: ${scanResult.failedCount}`
        );
        loadFolders();
      } else {
        onShowToastRef.current('导入文件夹失败');
      }
    } catch (error) {
      console.error('导入文件夹失败:', error);
      onShowToastRef.current('导入文件夹失败');
    }
  };

  // 添加文件到当前文件夹
  const handleAddFiles = async () => {
    if (!currentFolder) return;

    try {
      const result = await window.electron.invoke('local-music-select-files');
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      onShowToastRef.current('正在添加文件...');
      const addResult = await window.electron.invoke(
        'local-music-add-files',
        currentFolder.id,
        result.filePaths
      );

      if (addResult.success) {
        onShowToastRef.current(
          `添加完成！成功: ${addResult.successCount}, 失败: ${addResult.failedCount}`
        );
        loadTracks(currentFolder.id);
      } else {
        onShowToastRef.current('添加文件失败');
      }
    } catch (error) {
      console.error('添加文件失败:', error);
      onShowToastRef.current('添加文件失败');
    }
  };

  // 进入文件夹
  const handleEnterFolder = (folder: LocalFolder) => {
    setCurrentFolder(folder);
    setViewMode('tracks');
    loadTracks(folder.id);
  };

  // 返回文件夹列表
  const handleBackToFolders = () => {
    setViewMode('folders');
    setCurrentFolder(null);
    setTracks([]);
  };

  // 删除文件夹
  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      const result = await window.electron.invoke('local-music-delete-folder', folderToDelete.id);
      if (result.success) {
        onShowToastRef.current('文件夹已删除');
        setShowDeleteFolderDialog(false);
        setFolderToDelete(null);
        loadFolders();
      } else {
        onShowToastRef.current('删除文件夹失败');
      }
    } catch (error) {
      console.error('删除文件夹失败:', error);
      onShowToastRef.current('删除文件夹失败');
    }
  };

  // 重命名文件夹
  const handleRenameFolder = async () => {
    if (!folderToRename || !newFolderName.trim()) {
      onShowToastRef.current('请输入新名称');
      return;
    }

    try {
      const result = await window.electron.invoke(
        'local-music-rename-folder',
        folderToRename.id,
        newFolderName.trim()
      );
      if (result.success) {
        onShowToastRef.current('重命名成功');
        setShowRenameFolderDialog(false);
        setFolderToRename(null);
        setNewFolderName('');
        loadFolders();
      } else {
        onShowToastRef.current('重命名失败');
      }
    } catch (error) {
      console.error('重命名失败:', error);
      onShowToastRef.current('重命名失败');
    }
  };

  // 删除歌曲
  const handleDeleteTrack = async () => {
    if (!trackToDelete) return;

    try {
      const result = await window.electron.invoke('local-music-delete-track', trackToDelete.id);
      if (result.success) {
        onShowToastRef.current('歌曲已删除');
        setShowDeleteTrackDialog(false);
        setTrackToDelete(null);
        if (currentFolder) {
          loadTracks(currentFolder.id);
        }
      } else {
        onShowToastRef.current('删除歌曲失败');
      }
    } catch (error) {
      console.error('删除歌曲失败:', error);
      onShowToastRef.current('删除歌曲失败');
    }
  };

  // 播放本地歌曲
  const handlePlayTrack = (track: LocalTrack) => {
    // 转换为 Song 格式
    const song: Song = {
      id: `local_${track.id}`,
      title: track.title,
      artist: track.artist,
      album: track.album,
      coverUrl: track.cover_path ? `localmusic://localhost/${encodeURIComponent(track.cover_path.replace(/\\/g, '/'))}` : '',
      duration: track.duration,
      source: 'local',
    };

    onPlaySongRef.current(song);
  };

  // 转换本地歌曲为 Song 格式
  const convertTrackToSong = (track: LocalTrack): Song => {
    return {
      id: `local_${track.id}`,
      title: track.title,
      artist: track.artist,
      album: track.album,
      coverUrl: track.cover_path ? `localmusic://localhost/${encodeURIComponent(track.cover_path.replace(/\\/g, '/'))}` : '',
      duration: track.duration,
      source: 'local',
    };
  };

  // 处理添加到歌单按钮点击
  const handleAddToPlaylist = (track: LocalTrack, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡,避免触发播放
    setSongToAdd(convertTrackToSong(track));
    setShowAddToPlaylistDialog(true);
  };

  // 添加歌曲到歌单
  const handleAddSongToPlaylist = async (playlistId: string) => {
    if (!songToAdd) return;

    try {
      const result = await window.electron.invoke(
        'app-db-playlist-add-song',
        playlistId,
        songToAdd
      );

      if (result.success) {
        onShowToastRef.current('已添加到歌单');
      } else {
        onShowToastRef.current('添加失败');
      }
    } catch (error) {
      console.error('添加到歌单失败:', error);
      onShowToastRef.current('添加失败');
    }
  };

  // 创建新歌单
  const handleCreatePlaylist = async (
    name: string,
    description?: string
  ): Promise<string> => {
    const result = await window.electron.invoke(
      'app-db-playlist-create',
      name,
      description
    );

    if (result.success && result.id) {
      return result.id;
    } else {
      throw new Error('创建歌单失败');
    }
  };

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化日期
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  // 文件夹列表视图
  if (viewMode === 'folders') {
    return (
      <div className="p-8">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Folder size={24} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">本地歌曲</h1>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateFolderDialog(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
            >
              <Plus size={18} />
              新建虚拟文件夹
            </button>
            <button
              onClick={handleImportFolder}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
            >
              <FolderPlus size={18} />
              导入本机目录
            </button>
          </div>
        </div>

        {/* 文件夹列表 */}
        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <Folder size={64} className="mb-4" />
            <p>还没有本地音乐文件夹</p>
            <p className="text-sm mt-2">点击上方按钮创建或导入</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
            {/* 表头 */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
              <div className="w-12 text-center">
                <Folder size={16} className="inline-block" />
              </div>
              <div>文件夹名称</div>
              <div className="w-24 text-center">歌曲数量</div>
              <div className="w-32 text-center">创建时间</div>
              <div className="w-24 text-center">操作</div>
            </div>

            {/* 文件夹列表 */}
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors"
                onClick={() => handleEnterFolder(folder)}
              >
                {/* 文件夹图标 */}
                <div className="w-12 text-center">
                  <Folder size={32} className="text-primary inline-block" />
                </div>

                {/* 文件夹名称 */}
                <div className="text-slate-900 font-medium">{folder.name}</div>

                {/* 歌曲数量 */}
                <div className="w-24 text-center text-slate-500 text-sm">
                  {folder.trackCount} 首
                </div>

                {/* 创建时间 */}
                <div className="w-32 text-center text-slate-400 text-sm">
                  {formatDate(folder.created_at)}
                </div>

                {/* 操作按钮 */}
                <div className="w-24 text-center">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToRename(folder);
                        setNewFolderName(folder.name);
                        setShowRenameFolderDialog(true);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                      title="重命名文件夹"
                    >
                      <Edit2 size={16} className="text-slate-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToDelete(folder);
                        setShowDeleteFolderDialog(true);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                      title="删除文件夹"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 创建文件夹对话框 */}
        <Dialog
          open={showCreateFolderDialog}
          onClose={() => {
            setShowCreateFolderDialog(false);
            setNewFolderName('');
          }}
          title="新建虚拟文件夹"
          actions={
            <>
              <DialogButton
                onClick={() => {
                  setShowCreateFolderDialog(false);
                  setNewFolderName('');
                }}
              >
                取消
              </DialogButton>
              <DialogButton
                variant="primary"
                onClick={handleCreateEmptyFolder}
                disabled={!newFolderName.trim()}
              >
                创建
              </DialogButton>
            </>
          }
        >
          <DialogInput
            label="文件夹名称"
            value={newFolderName}
            onChange={setNewFolderName}
            placeholder="请输入文件夹名称"
            required
            onEnter={handleCreateEmptyFolder}
          />
        </Dialog>

        {/* 重命名文件夹对话框 */}
        <Dialog
          open={showRenameFolderDialog && folderToRename !== null}
          onClose={() => {
            setShowRenameFolderDialog(false);
            setFolderToRename(null);
            setNewFolderName('');
          }}
          title="重命名文件夹"
          actions={
            <>
              <DialogButton
                onClick={() => {
                  setShowRenameFolderDialog(false);
                  setFolderToRename(null);
                  setNewFolderName('');
                }}
              >
                取消
              </DialogButton>
              <DialogButton
                variant="primary"
                onClick={handleRenameFolder}
                disabled={!newFolderName.trim()}
              >
                确定
              </DialogButton>
            </>
          }
        >
          <DialogInput
            label="新名称"
            value={newFolderName}
            onChange={setNewFolderName}
            placeholder="请输入新名称"
            required
            onEnter={handleRenameFolder}
          />
        </Dialog>

        {/* 删除文件夹确认对话框 */}
        <Dialog
          open={showDeleteFolderDialog && folderToDelete !== null}
          onClose={() => {
            setShowDeleteFolderDialog(false);
            setFolderToDelete(null);
          }}
          title="删除文件夹"
          maxWidth="sm"
          actions={
            <>
              <DialogButton
                onClick={() => {
                  setShowDeleteFolderDialog(false);
                  setFolderToDelete(null);
                }}
              >
                取消
              </DialogButton>
              <DialogButton
                variant="primary"
                onClick={handleDeleteFolder}
              >
                确定
              </DialogButton>
            </>
          }
        >
          <p className="text-slate-700">
            确定要删除文件夹 <span className="font-semibold">"{folderToDelete?.name}"</span> 吗？
            这将删除其中的所有歌曲记录。
          </p>
        </Dialog>
      </div>
    );
  }

  // 歌曲列表视图
  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* 标题栏 */}
      <div className="px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToFolders}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{currentFolder?.name}</h1>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="px-6 py-3 bg-white border-b border-slate-200">
        <button
          onClick={handleAddFiles}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
        >
          <Plus size={18} />
          添加歌曲
        </button>
      </div>

      {/* 歌曲列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Music size={64} className="mb-4" />
            <p>文件夹是空的</p>
            <p className="text-sm mt-2">点击"添加歌曲"按钮导入音频文件</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
            {/* 表头 */}
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
              <div className="w-10 text-center">#</div>
              <div>标题</div>
              <div>艺术家</div>
              <div className="w-16 text-center">时长</div>
              <div className="w-24 text-center">操作</div>
            </div>

            {/* 歌曲列表 */}
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors"
                onClick={() => handlePlayTrack(track)}
              >
                {/* 序号/播放按钮 */}
                <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
                  <span className="group-hover:hidden">{index + 1}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-play hidden group-hover:inline-block mx-auto"
                    aria-hidden="true"
                  >
                    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
                  </svg>
                </div>

                {/* 标题（带封面图） */}
                <div className="flex items-center gap-3">
                  {track.cover_path ? (
                    <img
                      className="w-10 h-10 rounded shadow-sm object-cover"
                      alt={track.title}
                      src={`localmusic://localhost/${encodeURIComponent(track.cover_path.replace(/\\/g, '/'))}`}
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded shadow-sm">
                      <Music size={16} className="text-slate-400" />
                    </div>
                  )}
                  <span className="text-slate-900 font-medium">{track.title}</span>
                </div>

                {/* 艺术家 */}
                <div className="text-slate-500 text-sm">{track.artist}</div>

                {/* 时长 */}
                <div className="w-16 text-center text-slate-400 text-sm font-mono">
                  {formatDuration(track.duration)}
                </div>

                {/* 操作按钮 */}
                <div className="w-24 text-center">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => handleAddToPlaylist(track, e)}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                      title="添加到歌单"
                    >
                      <ListPlus size={16} className="text-primary" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrackToDelete(track);
                        setShowDeleteTrackDialog(true);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                      title="删除歌曲"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-x text-red-500"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加到歌单对话框 */}
      <AddToPlaylistDialog
        isOpen={showAddToPlaylistDialog}
        onClose={() => {
          setShowAddToPlaylistDialog(false);
          setSongToAdd(null);
        }}
        song={songToAdd}
        onAddToPlaylist={handleAddSongToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {/* 删除歌曲确认对话框 */}
      <Dialog
        open={showDeleteTrackDialog && trackToDelete !== null}
        onClose={() => {
          setShowDeleteTrackDialog(false);
          setTrackToDelete(null);
        }}
        title="删除歌曲"
        maxWidth="sm"
        actions={
          <>
            <DialogButton
              onClick={() => {
                setShowDeleteTrackDialog(false);
                setTrackToDelete(null);
              }}
            >
              取消
            </DialogButton>
            <DialogButton
              variant="primary"
              onClick={handleDeleteTrack}
            >
              确定
            </DialogButton>
          </>
        }
      >
        <p className="text-slate-700">
          确定要删除歌曲 <span className="font-semibold">"{trackToDelete?.title}"</span> 吗？
        </p>
      </Dialog>
    </div>
  );
});

export default LocalView;
