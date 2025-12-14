import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import type { PlayerState } from '../types';
import { LyricsSettingsDialog } from './LyricsSettingsDialog';
import { Turntable } from './Turntable';

interface FullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  seek: (time: number) => void;
  togglePlay: () => void;
  prevSong: () => void;
  nextSong: () => void;
  setVolume: (volume: number) => void;
  onFontSizeChange: (size: number) => void;
  onOffsetChange: (offset: number) => void;
  onLyricsApply: (lyrics: string[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

const FullPlayer: React.FC<FullPlayerProps> = ({
  isOpen,
  onClose,
  playerState,
  seek,
  togglePlay,
  setVolume,
  onFontSizeChange,
  onOffsetChange,
  onLyricsApply,
  showToast,
}) => {
  const { currentSong, currentTime, volume, lyricsFontSize, lyricsOffset, coverStyle, isPlaying } = playerState;
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const volumeToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 根据歌词时间戳计算当前应该显示的歌词行
  const getActiveLineIndex = (): number => {
    if (!currentSong?.lyrics || currentSong.lyrics.length === 0) return 0;

    // 应用歌词偏移(毫秒转秒)
    const adjustedTime = currentTime + (lyricsOffset / 1000);

    let activeIndex = 0;
    for (let i = 0; i < currentSong.lyrics.length; i++) {
      const line = currentSong.lyrics[i];
      const lrcMatch = line.match(/^\[(\d+):(\d+)\.(\d+)\]/);

      if (lrcMatch) {
        const minutes = parseInt(lrcMatch[1]);
        const seconds = parseInt(lrcMatch[2]);
        const milliseconds = parseInt(lrcMatch[3]);
        const lineTime = minutes * 60 + seconds + milliseconds / 1000;

        if (adjustedTime >= lineTime) {
          activeIndex = i;
        } else {
          break;
        }
      }
    }
    return activeIndex;
  };

  const activeLineIndex = getActiveLineIndex();

  // Auto-scroll lyrics
  useEffect(() => {
    if (isOpen && currentSong && currentSong.lyrics && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      if (container.children[activeLineIndex]) {
        const lineElement = container.children[activeLineIndex] as HTMLElement;
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, isOpen, currentSong, activeLineIndex]);

  // 键盘快捷键控制
  useEffect(() => {
    if (!isOpen) return;

    // 显示音量提示的防抖函数
    const showVolumeToast = (newVolume: number) => {
      // 清除之前的定时器
      if (volumeToastTimerRef.current) {
        clearTimeout(volumeToastTimerRef.current);
      }

      // 设置新的定时器,延迟200ms显示提示
      volumeToastTimerRef.current = setTimeout(() => {
        showToast(`音量: ${Math.round(newVolume * 100)}%`, 'info', 1000);
      }, 200);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框中,不处理快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case ' ': // 空格键:播放/暂停
          e.preventDefault();
          togglePlay();
          break;

        case 'ArrowUp': { // 上方向键:增加音量
          e.preventDefault();
          const newVolume = Math.min(1, volume + 0.05);
          setVolume(newVolume);
          showVolumeToast(newVolume);
          break;
        }

        case 'ArrowDown': { // 下方向键:减少音量
          e.preventDefault();
          const newVolume = Math.max(0, volume - 0.05);
          setVolume(newVolume);
          showVolumeToast(newVolume);
          break;
        }

        case 'ArrowLeft': // 左方向键:后退5秒
          e.preventDefault();
          seek(Math.max(0, currentTime - 5));
          break;

        case 'ArrowRight': // 右方向键:前进5秒
          e.preventDefault();
          if (currentSong?.duration) {
            seek(Math.min(currentSong.duration, currentTime + 5));
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // 清理定时器
      if (volumeToastTimerRef.current) {
        clearTimeout(volumeToastTimerRef.current);
      }
    };
  }, [isOpen, togglePlay, setVolume, volume, seek, currentTime, currentSong, showToast]);

  if (!isOpen || !currentSong) return null;

  return (
    <div className="fixed inset-0 z-[50] bg-white text-slate-900 flex flex-col animate-slide-up pb-24">
      {/* Header */}
      <div className="relative h-16 flex items-center justify-center px-6 md:px-10 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-50">
        <button
          onClick={onClose}
          className="absolute left-6 md:left-10 p-2 hover:bg-slate-100 text-slate-600 rounded-full transition-colors"
        >
          <ChevronDown size={28} />
        </button>
        <div className="text-xs tracking-widest uppercase font-bold text-slate-400 text-center">正在播放</div>
      </div>

      {/* Main Content: 2 Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-12 overflow-hidden relative bg-gradient-to-br from-blue-50 via-white to-slate-50">

        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200 opacity-20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 opacity-30 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Left Column: Cover, Info, Lyric Settings */}
        <div className="flex flex-col items-center justify-center h-full space-y-8 relative z-10 md:items-start md:pl-10">

          {/* Album Art - 根据 coverStyle 条件渲染 */}
          {coverStyle === 'vinyl' ? (
            <Turntable
              isPlaying={isPlaying}
              coverUrl={currentSong.coverUrl}
            />
          ) : (
            <div className="relative aspect-square w-full max-w-[350px] md:max-w-[400px] shadow-2xl shadow-blue-900/10 rounded-3xl overflow-hidden border-4 border-white">
              {currentSong.coverUrl ? (
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="120"
                    height="120"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-400"
                  >
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Song Info */}
          <div className="text-center md:text-left space-y-2 w-full max-w-[400px]">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight tracking-tight">{currentSong.title}</h2>
            <p className="text-xl text-primary font-medium">{currentSong.artist}</p>
            <p className="text-sm text-slate-400 font-medium">{currentSong.album}</p>
          </div>

          {/* Bottom Left: Lyrics Settings Button */}
          <div className="pt-4">
             <button
                onClick={() => setShowSettingsDialog(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 hover:border-primary hover:text-primary"
             >
                <Settings size={16} />
                <span>歌词设置</span>
             </button>
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
                // 解析LRC格式歌词,提取时间戳和文本
                const lrcMatch = line.match(/^\[(\d+):(\d+)\.(\d+)\](.*)$/);
                const lyricsText = lrcMatch ? lrcMatch[4] : line;

                return (
                  <p
                    key={index}
                    className={`transition-all duration-500 transform origin-left cursor-pointer hover:text-slate-700
                      ${isActive
                        ? 'font-bold text-primary scale-105'
                        : 'text-slate-300 font-medium'
                      }
                    `}
                    style={{
                      fontSize: isActive ? `${lyricsFontSize * 1.5}px` : `${lyricsFontSize}px`,
                    }}
                  >
                    {lyricsText}
                  </p>
                );
              })
            ) : (
              <p className="text-slate-400 italic text-xl">暂无歌词</p>
            )}
          </div>
        </div>
      </div>

      {/* 歌词设置对话框 */}
      <LyricsSettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        currentSong={currentSong}
        fontSize={lyricsFontSize}
        offset={lyricsOffset}
        onFontSizeChange={onFontSizeChange}
        onOffsetChange={onOffsetChange}
        onLyricsApply={onLyricsApply}
        showToast={showToast}
      />
    </div>
  );
};

export default FullPlayer;
