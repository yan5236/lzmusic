import type { Song, PlayerState } from '../types';

/**
 * PlaylistDrawer 组件 - 播放列表抽屉
 * 显示当前播放队列,支持切换歌曲
 */

interface PlaylistDrawerProps {
  playerState: PlayerState;
  togglePlaylist: () => void;
  playSong: (song: Song) => void;
}

export default function PlaylistDrawer({ playerState, togglePlaylist, playSong }: PlaylistDrawerProps) {
  return (
    <div className={`fixed top-0 right-0 h-[calc(100vh-6rem)] w-80 bg-white border-l border-slate-200 transform transition-transform duration-300 z-[60] shadow-2xl ${playerState.showPlaylist ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200 font-bold text-lg flex justify-between items-center text-slate-800">
        <span>播放列表</span>
        <button onClick={togglePlaylist} className="text-xs text-slate-400 hover:text-primary">关闭</button>
      </div>

      {/* 播放队列列表 */}
      <div className="p-2 overflow-y-auto h-full pb-20">
        {playerState.queue.map((song, idx) => (
          <div
            key={`queue-${idx}`}
            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-slate-50 ${playerState.currentSong?.id === song.id ? 'bg-blue-50 border border-blue-100' : ''}`}
            onClick={() => playSong(song)}
          >
            {/* 封面和播放状态指示 */}
            <div className="relative w-10 h-10 flex-shrink-0">
              <img src={song.coverUrl} className="w-full h-full object-cover rounded shadow-sm" alt="art"/>
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
          </div>
        ))}
      </div>
    </div>
  );
}
