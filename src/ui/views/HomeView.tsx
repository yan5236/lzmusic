import { Play } from 'lucide-react';
import type { Song, PlayerState } from '../types';
import { MOCK_SONGS } from '../constants';

/**
 * HomeView 组件 - 首页视图
 * 展示每日推荐和最近播放列表
 */

interface HomeViewProps {
  playerState: PlayerState;
  playSong: (song: Song) => void;
}

export default function HomeView({ playerState, playSong }: HomeViewProps) {
  return (
    <div className="p-8 space-y-8">
      {/* 每日推荐 */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-slate-800">每日推荐</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {MOCK_SONGS.map((song) => (
            <div
              key={song.id}
              className="bg-white p-4 rounded-xl hover:shadow-xl shadow-sm border border-slate-100 transition-all group cursor-pointer"
              onClick={() => playSong(song)}
            >
              <div className="relative aspect-square mb-4 overflow-hidden rounded-lg shadow-md">
                <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-primary p-3 rounded-full shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <Play fill="white" size={20} className="text-white"/>
                  </div>
                </div>
              </div>
              <h3 className="font-bold text-slate-900 truncate">{song.title}</h3>
              <p className="text-sm text-slate-500 truncate">{song.artist}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 最近播放 */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-slate-800">最近播放</h2>
        <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
          {playerState.history.length > 0 ? playerState.history.slice(0, 3).map((song, i) => (
            <div key={`recent-${i}`} className="flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group" onClick={() => playSong(song)}>
              <div className="flex items-center gap-4">
                <span className="text-primary font-mono w-4 text-center opacity-0 group-hover:opacity-100 transition-opacity"><Play size={12} fill="currentColor"/></span>
                <img src={song.coverUrl} className="w-10 h-10 rounded shadow-sm" alt="cover" />
                <div>
                  <div className="text-slate-900 font-medium">{song.title}</div>
                  <div className="text-xs text-slate-500">{song.artist}</div>
                </div>
              </div>
              <div className="text-slate-400 text-sm font-mono">{Math.floor(Math.round(song.duration) / 60)}:{(Math.round(song.duration) % 60).toString().padStart(2, '0')}</div>
            </div>
          )) : (
            <div className="p-6 text-center text-slate-400">暂无播放记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
