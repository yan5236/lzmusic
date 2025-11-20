import { Play, History } from 'lucide-react';
import type { Song, PlayerState } from '../types';

/**
 * HistoryView 组件 - 历史播放视图
 * 展示用户的播放历史记录
 */

interface HistoryViewProps {
  playerState: PlayerState;
  playSong: (song: Song) => void;
}

export default function HistoryView({ playerState, playSong }: HistoryViewProps) {
  return (
    <div className="p-8">
      {/* 标题区域 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 rounded-xl text-primary">
          <History size={24} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">历史播放</h1>
      </div>

      {/* 历史播放列表 */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
          <div className="w-10 text-center">#</div>
          <div>标题</div>
          <div>歌手</div>
          <div className="w-16 text-center">时长</div>
        </div>
        {playerState.history.length > 0 ? playerState.history.map((song, i) => (
          <div key={`history-${i}`} className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors" onClick={() => playSong(song)}>
            <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
              <span className="group-hover:hidden">{i + 1}</span>
              <Play size={14} className="hidden group-hover:inline-block mx-auto" fill="currentColor"/>
            </div>
            <div className="flex items-center gap-3">
              <img src={song.coverUrl} className="w-10 h-10 rounded shadow-sm" alt={song.title}/>
              <span className="text-slate-900 font-medium">{song.title}</span>
            </div>
            <div className="text-slate-500 text-sm">{song.artist}</div>
            <div className="w-16 text-center text-slate-400 text-sm font-mono">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</div>
          </div>
        )) : (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <History size={48} className="mb-4 opacity-20"/>
            <p>暂无历史播放记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
