import { Music } from 'lucide-react';
import type { Song, PlayerState } from '../types';

/**
 * PlaylistDrawer 组件 - 播放列表抽屉
 * 显示当前播放队列,支持切换歌曲
 */

interface PlaylistDrawerProps {
  playerState: PlayerState;
  togglePlaylist: () => void;
  playSong: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
}

export default function PlaylistDrawer({ playerState, togglePlaylist, playSong, removeFromQueue }: PlaylistDrawerProps) {
  return (
    <div className={`fixed top-0 right-0 bottom-24 w-80 bg-white border-l border-slate-200 transform transition-transform duration-300 z-[60] shadow-2xl ${playerState.showPlaylist ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200 font-bold text-lg flex justify-between items-center text-slate-800">
        <span>播放列表</span>
        <button onClick={togglePlaylist} className="text-xs text-slate-400 hover:text-primary">关闭</button>
      </div>

      {/* 播放队列列表 */}
      <div className="p-2 overflow-y-auto h-[calc(100%-4rem)]">
        {playerState.queue.map((song, idx) => (
          <div
            key={`queue-${idx}`}
            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-slate-50 ${playerState.currentSong?.id === song.id ? 'bg-blue-50 border border-blue-100' : ''}`}
            onClick={() => playSong(song)}
          >
            {/* 封面和播放状态指示 */}
            <div className="relative w-10 h-10 flex-shrink-0">
              {song.coverUrl ? (
                <img src={song.coverUrl} className="w-full h-full object-cover rounded shadow-sm" alt="art"/>
              ) : (
                <div className="w-full h-full rounded shadow-sm bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <Music size={16} className="text-slate-400" />
                </div>
              )}
              {playerState.currentSong?.id === song.id && playerState.isPlaying ? (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-sm"></div>
                </div>
              ) : playerState.currentSong?.id === song.id && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded">
                  <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-1"></div>
                </div>
              )}
            </div>

            {/* 歌曲信息 */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${playerState.currentSong?.id === song.id ? 'text-primary' : 'text-slate-800'}`}>{song.title}</div>
              <div className="text-xs text-slate-500 truncate">{song.artist}</div>
            </div>

            {/* 删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // 阻止事件冒泡，避免触发播放
                removeFromQueue(song.id);
              }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
              title="从列表中移除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
