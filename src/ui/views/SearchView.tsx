import { Play } from 'lucide-react';
import type { Song } from '../types';
import { MOCK_SONGS } from '../constants';

/**
 * SearchView 组件 - 搜索视图
 * 提供歌曲搜索功能,支持按标题、歌手、专辑、歌词搜索
 */

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  playSong: (song: Song) => void;
}

// 搜索图标占位符组件
const SearchIconPlaceholder = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export default function SearchView({ searchQuery, setSearchQuery, playSong }: SearchViewProps) {
  // 模拟搜索结果 - 根据搜索关键词过滤歌曲
  const searchResults = searchQuery.trim()
    ? MOCK_SONGS.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.lyrics.some(line => line.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <div className="p-8 flex flex-col h-full text-slate-500">
      {/* 搜索输入框 */}
      <div className="w-full max-w-4xl mx-auto mb-10 pt-4">
        <input
          type="text"
          placeholder="搜索歌曲、歌手、歌词..."
          className="w-full bg-white border border-slate-200 rounded-full py-4 px-6 text-slate-900 text-lg focus:ring-2 focus:ring-primary focus:outline-none shadow-lg placeholder:text-slate-400"
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 搜索结果显示区域 */}
      {searchQuery.trim() ? (
        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="space-y-6">
              {/* 搜索结果统计 */}
              <div className="text-slate-600">
                找到 <span className="font-bold text-primary">{searchResults.length}</span> 个结果
              </div>

              {/* 歌曲列表 */}
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
                  <div className="w-10 text-center">#</div>
                  <div>标题</div>
                  <div>歌手</div>
                  <div className="w-16 text-center">时长</div>
                </div>
                {searchResults.map((song, i) => (
                  <div
                    key={`search-${song.id}`}
                    className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 items-center group cursor-pointer transition-colors"
                    onClick={() => playSong(song)}
                  >
                    <div className="w-10 text-center text-slate-400 group-hover:text-primary font-mono text-sm">
                      <span className="group-hover:hidden">{i + 1}</span>
                      <Play size={14} className="hidden group-hover:inline-block mx-auto" fill="currentColor"/>
                    </div>
                    <div className="flex items-center gap-3">
                      <img src={song.coverUrl} className="w-10 h-10 rounded shadow-sm" alt={song.title}/>
                      <span className="text-slate-900 font-medium">{song.title}</span>
                    </div>
                    <div className="text-slate-500 text-sm">{song.artist}</div>
                    <div className="w-16 text-center text-slate-400 text-sm font-mono">
                      {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <SearchIconPlaceholder />
              <p className="text-lg mt-4">未找到相关结果</p>
              <p className="text-sm text-slate-400 mt-2">试试其他关键词吧</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <SearchIconPlaceholder />
          <p className="text-lg mt-4">输入关键词开始搜索...</p>
        </div>
      )}
    </div>
  );
}
