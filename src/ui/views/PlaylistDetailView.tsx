/**
 * PlaylistDetailView 组件 - 歌单详情视图
 * 显示歌单详细信息和歌曲列表，支持拖拽排序、批量删除等功能
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  ArrowLeft,
  Play,
  Edit2,
  Trash2,
  GripVertical,
  Check,
  X,
  Music,
  Camera,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Playlist, PlaylistSong, Song } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import { subscribePlaylistEvent } from '../utils/playlistEvents';

interface PlaylistDetailViewProps {
  playlistId: string;
  onNavigateBack: () => void;
  onPlaySong: (song: Song) => void;
  onPlayAll: (songs: Song[]) => void;
  onShowToast: (message: string) => void;
}

// 可排序的歌曲项组件
function SortableSongItem({
  song,
  index,
  isEditMode,
  isSelected,
  onToggleSelect,
  onPlay,
}: {
  song: PlaylistSong;
  index: number;
  isEditMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPlay: () => void;
}) {
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

  // 格式化时长（先四舍五入总秒数，再计算分秒，避免精度问题）
  const formatDuration = (seconds: number): string => {
    const totalSeconds = Math.round(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 编辑模式和普通模式使用不同的网格布局
  const gridClass = isEditMode
    ? 'grid-cols-[auto_auto_auto_1fr_1fr_auto]' // 拖拽手柄、复选框、封面、标题、歌手、时长
    : 'grid-cols-[auto_1fr_1fr_auto]'; // 序号+封面、标题、歌手、时长

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isEditMode && onPlay()}
      className={`grid ${gridClass} gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors ${
        isDragging ? 'bg-blue-50' : ''
      }`}
    >
      {/* 编辑模式：拖拽手柄 */}
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

      {/* 编辑模式：复选框 */}
      {isEditMode && (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
        </div>
      )}

      {/* 编辑模式：封面单独显示 */}
      {isEditMode && (
        <div className="w-10 h-10 rounded shadow-sm flex-shrink-0 overflow-hidden bg-slate-100">
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music size={16} className="text-slate-400" />
            </div>
          )}
        </div>
      )}

      {/* 普通模式：序号 + 封面组合 */}
      {!isEditMode && (
        <div className="flex items-center gap-3">
          {/* 序号，悬停时显示播放图标 */}
          <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
            <span className="group-hover:hidden">{index + 1}</span>
            <Play
              size={14}
              fill="currentColor"
              className="hidden group-hover:inline-block mx-auto"
            />
          </div>
          {/* 封面 */}
          <div className="w-10 h-10 rounded shadow-sm flex-shrink-0 overflow-hidden bg-slate-100">
            {song.coverUrl ? (
              <img
                src={song.coverUrl}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={16} className="text-slate-400" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 标题 */}
      <span className="text-slate-900 font-medium truncate">{song.title}</span>

      {/* 歌手 */}
      <div className="text-slate-500 text-sm truncate">{song.artist}</div>

      {/* 时长 */}
      <div className="w-16 text-center text-slate-400 text-sm font-mono">
        {formatDuration(song.duration)}
      </div>
    </div>
  );
}

// 使用 memo 包裹组件，只在 playlistId 变化时才重新渲染
// 避免父组件因播放状态更新导致的频繁重渲染
const PlaylistDetailView = memo(function PlaylistDetailView({
  playlistId,
  onNavigateBack,
  onPlaySong,
  onPlayAll,
  onShowToast,
}: PlaylistDetailViewProps) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 使用 ref 存储所有回调函数，避免它们的变化导致问题
  // 因为使用了 memo 并只比较 playlistId，回调函数引用不会触发重渲染
  // 但我们仍需要确保使用最新的回调
  const onShowToastRef = useRef(onShowToast);
  const onNavigateBackRef = useRef(onNavigateBack);
  const onPlaySongRef = useRef(onPlaySong);
  const onPlayAllRef = useRef(onPlayAll);

  // 保持 ref 最新
  useEffect(() => {
    onShowToastRef.current = onShowToast;
    onNavigateBackRef.current = onNavigateBack;
    onPlaySongRef.current = onPlaySong;
    onPlayAllRef.current = onPlayAll;
  });

  // 加载歌单详情
  const loadPlaylistDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.invoke(
        'app-db-playlist-get-detail',
        playlistId
      );
      if (result.success && result.data) {
        setPlaylist(result.data.playlist);
        setSongs(result.data.songs);
        setEditedName(result.data.playlist.name);
      } else {
        onShowToastRef.current('加载歌单失败');
        onNavigateBackRef.current();
      }
    } catch (error) {
      console.error('加载歌单详情失败:', error);
      onShowToastRef.current('加载歌单失败');
      onNavigateBackRef.current();
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]); // 只依赖 playlistId，回调函数通过 ref 访问

  useEffect(() => {
    loadPlaylistDetail();
  }, [loadPlaylistDetail]);

  // 监听歌单更新事件，自动刷新详情
  useEffect(() => {
    const unsubscribe = subscribePlaylistEvent('playlist-updated', () => {
      loadPlaylistDetail();
    });

    return () => {
      unsubscribe();
    };
  }, [loadPlaylistDetail]);

  // 处理拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = songs.findIndex((s) => s.id === active.id);
      const newIndex = songs.findIndex((s) => s.id === over.id);

      const newSongs = arrayMove(songs, oldIndex, newIndex);
      setSongs(newSongs);

      // 保存新顺序到数据库
      try {
        const songIds = newSongs.map((s) => s.id);
        await window.electron.invoke(
          'app-db-playlist-reorder-songs',
          playlistId,
          songIds
        );
      } catch (error) {
        console.error('保存排序失败:', error);
        onShowToast('保存排序失败');
        // 回滚
        setSongs(songs);
      }
    }
  };

  // 切换歌曲选择
  const toggleSongSelection = (songId: string) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedSongs.size === songs.length) {
      setSelectedSongs(new Set());
    } else {
      setSelectedSongs(new Set(songs.map((s) => s.id)));
    }
  };

  // 批量删除歌曲
  const handleDeleteSelected = async () => {
    if (selectedSongs.size === 0) return;

    try {
      const result = await window.electron.invoke(
        'app-db-playlist-remove-songs',
        playlistId,
        Array.from(selectedSongs)
      );

      if (result.success) {
        onShowToast(`已删除 ${selectedSongs.size} 首歌曲`);
        setSelectedSongs(new Set());
        setIsEditMode(false);
        await loadPlaylistDetail();
      } else {
        onShowToast('删除歌曲失败');
      }
    } catch (error) {
      console.error('删除歌曲失败:', error);
      onShowToast('删除歌曲失败');
    }
  };

  // 删除整个歌单
  const handleDeletePlaylist = async () => {
    try {
      const result = await window.electron.invoke(
        'app-db-playlist-delete',
        playlistId
      );

      if (result.success) {
        onShowToast('歌单已删除');
        onNavigateBack();
      } else {
        onShowToast('删除歌单失败');
      }
    } catch (error) {
      console.error('删除歌单失败:', error);
      onShowToast('删除歌单失败');
    }
  };

  // 保存歌单名称
  const handleSaveName = async () => {
    if (!editedName.trim()) {
      onShowToast('歌单名称不能为空');
      return;
    }

    try {
      const result = await window.electron.invoke(
        'app-db-playlist-update',
        playlistId,
        { name: editedName.trim() }
      );

      if (result.success) {
        setIsEditingName(false);
        onShowToast('歌单名称已更新');
        await loadPlaylistDetail();
      } else {
        onShowToast('更新失败');
      }
    } catch (error) {
      console.error('更新歌单名称失败:', error);
      onShowToast('更新失败');
    }
  };

  // 播放所有歌曲
  const handlePlayAll = () => {
    if (songs.length > 0) {
      onPlayAllRef.current(songs);
    }
  };

  if (isLoading || !playlist) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-slate-50">
        {/* 顶部信息栏 */}
        <div className="bg-white border-b border-slate-200">
          <div className="px-8 py-6">
            {/* 返回按钮 */}
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
            >
              <ArrowLeft size={20} />
              <span>返回</span>
            </button>

            {/* 歌单信息 */}
            <div className="flex gap-6">
              {/* 封面 */}
              <div className="relative group">
                <div className="w-48 h-48 rounded-xl overflow-hidden bg-slate-100 shadow-lg flex-shrink-0">
                  {playlist.coverUrl || (songs.length > 0 && songs[0].coverUrl) ? (
                    <img
                      src={playlist.coverUrl || songs[0].coverUrl}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                      <Music size={64} className="text-slate-400" />
                    </div>
                  )}
                  {/* 更换封面按钮（悬停显示） */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="p-3 bg-white rounded-full hover:bg-slate-100">
                      <Camera size={24} className="text-slate-700" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 文字信息 */}
              <div className="flex-1 flex flex-col justify-center">
                {/* 歌单名称 */}
                <div className="mb-4">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="text-3xl font-bold text-slate-800 border-b-2 border-blue-500 outline-none bg-transparent px-2"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                        }}
                        placeholder="请输入歌单名称"
                      />
                      {/* 非编辑模式下显示保存/取消按钮 */}
                      {!isEditMode && (
                        <>
                          <button
                            onClick={handleSaveName}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                          >
                            <Check size={20} />
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingName(false);
                              setEditedName(playlist.name);
                            }}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full"
                          >
                            <X size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold text-slate-800">
                        {playlist.name}
                      </h1>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 统计信息 */}
                <div className="text-slate-600 mb-6">
                  <span>{songs.length} 首歌曲</span>
                  {playlist.createdAt && (
                    <>
                      <span className="mx-2">·</span>
                      <span>
                        创建于{' '}
                        {new Date(playlist.createdAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={handlePlayAll}
                    disabled={songs.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Play size={20} />
                    <span className="font-medium">播放全部</span>
                  </button>

                  <button
                    onClick={() => {
                      const newEditMode = !isEditMode;
                      setIsEditMode(newEditMode);
                      setSelectedSongs(new Set());
                      // 进入编辑模式时，同时启用歌单名称编辑
                      if (newEditMode) {
                        setIsEditingName(true);
                      } else {
                        // 退出编辑模式时，如果名称有修改则保存
                        if (isEditingName && editedName.trim() && editedName.trim() !== playlist?.name) {
                          handleSaveName();
                        } else {
                          setIsEditingName(false);
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-full hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 size={18} />
                    <span>{isEditMode ? '完成' : '编辑'}</span>
                  </button>

                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-red-300 text-red-600 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={18} />
                    <span>删除歌单</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 编辑模式工具栏 */}
          {isEditMode && (
            <div className="px-8 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedSongs.size === songs.length && songs.length > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-slate-700">
                  已选择 {selectedSongs.size} 首歌曲
                </span>
              </div>

              <button
                onClick={handleDeleteSelected}
                disabled={selectedSongs.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Trash2 size={18} />
                <span>删除选中</span>
              </button>
            </div>
          )}
        </div>

        {/* 歌曲列表 */}
        <div className="flex-1 overflow-y-auto">
          {songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Music size={64} className="mb-4 opacity-50" />
              <p className="text-xl font-medium mb-2">歌单为空</p>
              <p className="text-sm">在搜索页面或播放器中添加歌曲到此歌单</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl m-6 overflow-hidden border border-slate-100 shadow-sm">
              {/* 表头 - 仅在非编辑模式显示 */}
              {!isEditMode && (
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
                  {/* 序号列宽度需与歌曲行的序号+封面组合对齐（w-10 序号 + gap-3 + w-10 封面） */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 text-center">#</div>
                    <div className="w-10"></div>
                  </div>
                  <div>标题</div>
                  <div>歌手</div>
                  <div className="w-16 text-center">时长</div>
                </div>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
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
                      onToggleSelect={() => toggleSongSelection(song.id)}
                      onPlay={() => onPlaySongRef.current(song)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      {/* 删除歌单确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeletePlaylist}
        title="删除歌单"
        message={`确定要删除歌单「${playlist.name}」吗？\n此操作无法撤销，歌单中的所有歌曲都将被移除。`}
        confirmText="删除"
        isDanger={true}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // 只在 playlistId 变化时才重新渲染组件
  // 回调函数的引用变化不应触发重渲染
  return prevProps.playlistId === nextProps.playlistId;
});

export default PlaylistDetailView;
