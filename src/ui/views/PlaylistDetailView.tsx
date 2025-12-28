/**
 * PlaylistDetailView 组件 - 歌单详情视图
 * 显示歌单详细信息和歌曲列表，支持拖拽排序、批量删除等功能
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Playlist, PlaylistSong, Song } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import { subscribePlaylistEvent } from '../utils/playlistEvents';
import {
  PlaylistHeader,
  EditToolbar,
  SongList,
} from '../components/PlaylistDetail';

interface PlaylistDetailViewProps {
  playlistId: string;
  onNavigateBack: () => void;
  onPlaySong: (song: Song) => void;
  onPlayAll: (songs: Song[]) => void;
  onShowToast: (message: string) => void;
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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

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
        setEditedDescription(result.data.playlist.description || '');
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
        setIsEditingName(false);  // 同时退出名称编辑状态
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

  // 保存歌单简介
  const handleSaveDescription = async () => {
    try {
      const description = editedDescription.trim();
      const result = await window.electron.invoke(
        'app-db-playlist-update',
        playlistId,
        { description }
      );

      if (result.success) {
        setIsEditingDescription(false);
        onShowToast('歌单简介已更新');
        await loadPlaylistDetail();
      } else {
        onShowToast('更新失败');
      }
    } catch (error) {
      console.error('更新歌单简介失败:', error);
      onShowToast('更新失败');
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

  const handleEditModeToggle = () => {
    const newEditMode = !isEditMode;
    setIsEditMode(newEditMode);
    setSelectedSongs(new Set());
    if (newEditMode) {
      setIsEditingDescription(true);
    } else {
      if (isEditingName && editedName.trim() && editedName.trim() !== playlist?.name) {
        handleSaveName();
      } else {
        setIsEditingName(false);
      }
      if (isEditingDescription) {
        handleSaveDescription();
      }
    }
  };

  const handleEditNameToggle = () => {
    setIsEditingName(true);
  };

  const handleCancelName = () => {
    setIsEditingName(false);
    setEditedName(playlist.name);
  };

  const handleCancelDescription = () => {
    setIsEditingDescription(false);
    setEditedDescription(playlist.description || '');
  };

  return (
    <>
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 m-8 mb-4"
          >
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>

          <PlaylistHeader
            playlist={playlist}
            songs={songs}
            isEditMode={isEditMode}
            isEditingName={isEditingName}
            editedName={editedName}
            onEditNameToggle={handleEditNameToggle}
            onNameChange={setEditedName}
            onSaveName={handleSaveName}
            onCancelName={handleCancelName}
            isEditingDescription={isEditingDescription}
            editedDescription={editedDescription}
            onDescriptionChange={setEditedDescription}
            onSaveDescription={handleSaveDescription}
            onCancelDescription={handleCancelDescription}
            onPlayAll={handlePlayAll}
            onEditModeToggle={handleEditModeToggle}
            onDeletePlaylist={() => setShowDeleteDialog(true)}
          />

          {isEditMode && (
            <EditToolbar
              selectedCount={selectedSongs.size}
              totalCount={songs.length}
              onToggleSelectAll={toggleSelectAll}
              isAllSelected={selectedSongs.size === songs.length && songs.length > 0}
              onDeleteSelected={handleDeleteSelected}
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden">
          <SongList
            songs={songs}
            selectedSongs={selectedSongs}
            isEditMode={isEditMode}
            sensors={sensors}
            onDragEnd={handleDragEnd}
            onToggleSelect={toggleSongSelection}
            onPlaySong={(song) => onPlaySongRef.current(song)}
          />
        </div>
      </div>

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
