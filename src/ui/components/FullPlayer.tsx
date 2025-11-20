import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Settings, MoreHorizontal, Type, Languages, MessageSquare } from 'lucide-react';
import type { PlayerState } from '../types';

interface FullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  seek: (time: number) => void;
  togglePlay: () => void;
  prevSong: () => void;
  nextSong: () => void;
}

const FullPlayer: React.FC<FullPlayerProps> = ({
  isOpen,
  onClose,
  playerState,
}) => {
  const { currentSong, currentTime } = playerState;
  const [showSettings, setShowSettings] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll lyrics
  useEffect(() => {
    if (isOpen && currentSong && currentSong.lyrics && lyricsContainerRef.current) {
      const totalLines = currentSong.lyrics.length;
      const progress = currentTime / currentSong.duration;
      const activeLineIndex = Math.floor(progress * totalLines);

      const container = lyricsContainerRef.current;
      if (container.children[activeLineIndex]) {
        const lineElement = container.children[activeLineIndex] as HTMLElement;
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, isOpen, currentSong]);

  if (!isOpen || !currentSong) return null;

  // Calculate active lyric line based on time
  const activeLineIndex = currentSong.lyrics
    ? Math.floor((currentTime / currentSong.duration) * currentSong.lyrics.length)
    : 0;

  return (
    <div className="fixed inset-0 z-[50] bg-white text-slate-900 flex flex-col animate-slide-up pb-24">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 md:px-10 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-50">
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 text-slate-600 rounded-full transition-colors"
        >
          <ChevronDown size={28} />
        </button>
        <div className="text-xs tracking-widest uppercase font-bold text-slate-400">正在播放</div>
        <button className="p-2 hover:bg-slate-100 text-slate-600 rounded-full transition-colors">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Main Content: 2 Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-12 overflow-hidden relative bg-gradient-to-br from-blue-50 via-white to-slate-50">

        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200 opacity-20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 opacity-30 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Left Column: Cover, Info, Lyric Settings */}
        <div className="flex flex-col items-center justify-center h-full space-y-8 relative z-10 md:items-start md:pl-10">

          {/* Album Art */}
          <div className="relative aspect-square w-full max-w-[350px] md:max-w-[400px] shadow-2xl shadow-blue-900/10 rounded-3xl overflow-hidden border-4 border-white">
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Song Info */}
          <div className="text-center md:text-left space-y-2 w-full max-w-[400px]">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight tracking-tight">{currentSong.title}</h2>
            <p className="text-xl text-primary font-medium">{currentSong.artist}</p>
            <p className="text-sm text-slate-400 font-medium">{currentSong.album}</p>
          </div>

          {/* Bottom Left: Lyrics Settings (Requirement) */}
          <div className="pt-4">
             <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${showSettings ? 'bg-primary text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
             >
                <Settings size={16} />
                <span>歌词设置</span>
             </button>

             {showSettings && (
               <div className="mt-4 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 w-64 animate-slide-up absolute md:relative z-30">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-slate-600 hover:text-primary cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Type size={18} />
                        <span className="text-sm font-medium">字体大小</span>
                      </div>
                      <div className="flex gap-1">
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">A-</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">A+</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 hover:text-primary cursor-pointer">
                      <div className="flex items-center gap-3">
                         <Languages size={18} />
                         <span className="text-sm font-medium">翻译</span>
                      </div>
                      <div className="w-8 h-4 bg-slate-200 rounded-full relative">
                         <div className="w-4 h-4 bg-white rounded-full shadow-sm absolute left-0"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 hover:text-primary cursor-pointer">
                      <div className="flex items-center gap-3">
                         <MessageSquare size={18} />
                         <span className="text-sm font-medium">罗马拼音</span>
                      </div>
                    </div>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: Lyrics */}
        <div className="flex flex-col justify-center h-full relative z-10 overflow-hidden mask-linear-gradient">
          <div
            ref={lyricsContainerRef}
            className="h-[60vh] overflow-y-auto hide-scrollbar text-center md:text-left px-4 space-y-6 md:space-y-8 py-[30vh]"
          >
            {currentSong.lyrics && currentSong.lyrics.length > 0 ? (
              currentSong.lyrics.map((line, index) => {
                const isActive = index === activeLineIndex;
                return (
                  <p
                    key={index}
                    className={`transition-all duration-500 transform origin-left cursor-pointer hover:text-slate-700
                      ${isActive
                        ? 'text-3xl md:text-4xl font-bold text-primary scale-105'
                        : 'text-lg md:text-xl text-slate-300 font-medium'
                      }
                    `}
                  >
                    {line}
                  </p>
                );
              })
            ) : (
              <p className="text-slate-400 italic text-xl">暂无歌词</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullPlayer;
