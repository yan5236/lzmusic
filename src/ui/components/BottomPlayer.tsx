import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Maximize2, VolumeX, Minimize2, Repeat, Repeat1, Shuffle } from 'lucide-react';
import { PlaybackMode } from '../types';
import type { PlayerState } from '../types';
import ProgressBar from './ProgressBar';

interface BottomPlayerProps {
  playerState: PlayerState;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (time: number) => void;
  changeVolume: (val: number) => void;
  toggleFullPlayer: () => void;
  togglePlaylist: () => void;
  toggleMode: () => void;
}

const BottomPlayer: React.FC<BottomPlayerProps> = ({
  playerState,
  togglePlay,
  nextSong,
  prevSong,
  seek,
  changeVolume,
  toggleFullPlayer,
  togglePlaylist,
  toggleMode
}) => {
  const { currentSong, isPlaying, currentTime, volume, isFullPlayerOpen, mode } = playerState;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="h-24 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 flex items-center justify-between px-6 fixed bottom-0 left-0 z-[60] shadow-[0_-8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
      {!currentSong ? (
        /* 空状态 - 显示占位符UI */
        <>
          {/* Left: 占位符封面和歌曲信息 */}
          <div className="flex items-center gap-4 w-[250px] flex-shrink-0 mr-4">
            <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center">
              <span className="text-slate-400 text-xs">暂无封面</span>
            </div>
            <div className="flex flex-col justify-center overflow-hidden">
              <h3 className="text-sm font-medium text-slate-400 truncate">暂无播放内容</h3>
              <p className="text-xs text-slate-300 truncate">请搜索并点击歌曲播放</p>
            </div>
          </div>

          {/* Center: 播放控制和进度条 */}
          <div className="flex-1 flex items-center gap-6 px-4 max-w-3xl">
            {/* 控制按钮 */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <button className="p-1.5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
                <SkipBack size={20} className="text-slate-300" />
              </button>
              <button className="p-3 rounded-full bg-slate-200 hover:bg-slate-300 transition-all disabled:opacity-50" disabled>
                <Play size={20} className="text-slate-400" fill="currentColor" />
              </button>
              <button className="p-1.5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
                <SkipForward size={20} className="text-slate-300" />
              </button>
            </div>

            {/* 进度条 */}
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs text-slate-400 tabular-nums w-10 text-right">0:00</span>
              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 transition-all duration-300" style={{ width: '0%' }} />
              </div>
              <span className="text-xs text-slate-400 tabular-nums w-10">0:00</span>
            </div>
          </div>

          {/* Right: 音量等控制 */}
          <div className="flex items-center gap-3 w-[200px] justify-end flex-shrink-0">
            <button className="p-1.5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
              <Repeat size={18} className="text-slate-300" />
            </button>
            <button className="p-1.5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
              <Volume2 size={18} className="text-slate-300" />
            </button>
            <button className="p-1.5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
              <ListMusic size={18} className="text-slate-300" />
            </button>
          </div>
        </>
      ) : (
        /* 正常播放状态 */
        <>

      {/* Left: Song Info */}
      <div className="flex items-center gap-4 w-[250px] flex-shrink-0 mr-4">
        <div className="relative group w-14 h-14 flex-shrink-0">
          <img
            src={currentSong.coverUrl}
            alt={currentSong.title}
            className={`w-full h-full rounded-lg object-cover shadow-md border border-slate-100 ${isPlaying ? 'animate-pulse' : ''}`}
          />
          <div
            onClick={toggleFullPlayer}
            className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
          >
            {isFullPlayerOpen ? <Minimize2 size={20} className="text-white" /> : <Maximize2 size={20} className="text-white" />}
          </div>
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-slate-900 font-bold truncate cursor-pointer hover:text-primary transition-colors" onClick={toggleFullPlayer}>
            {currentSong.title}
          </span>
          <span className="text-slate-500 text-xs truncate">{currentSong.artist}</span>
        </div>
      </div>

      {/* Center: Controls & Progress Bar */}
      <div className="flex flex-1 items-center gap-6 px-4 max-w-3xl">
         {/* Controls Group (Left aligned relative to progress) */}
         <div className="flex items-center gap-4 flex-shrink-0">
            <button onClick={prevSong} className="text-slate-400 hover:text-primary transition-colors p-2 hover:bg-slate-50 rounded-full">
                <SkipBack size={22} fill="currentColor" />
            </button>

            <button
                onClick={togglePlay}
                className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-105 hover:bg-blue-700 transition-all"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>

            <button onClick={nextSong} className="text-slate-400 hover:text-primary transition-colors p-2 hover:bg-slate-50 rounded-full">
                <SkipForward size={22} fill="currentColor" />
            </button>
         </div>

         {/* Progress Bar Group (Right of controls) */}
         <div className="flex items-center gap-3 flex-1">
             <span className="text-xs text-slate-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
             <ProgressBar
                 current={currentTime}
                 max={currentSong.duration}
                 onChange={seek}
                 className="h-1.5"
                 color="bg-primary"
                 trackColor="bg-slate-200"
             />
             <span className="text-xs text-slate-400 font-mono w-10">{formatTime(currentSong.duration)}</span>
         </div>
      </div>

      {/* Right: Volume & Extras */}
      <div className="flex items-center justify-end gap-2 w-[250px] flex-shrink-0 ml-4">

        {/* Mode Toggle */}
        <button
          onClick={toggleMode}
          className="p-2 text-slate-400 hover:text-primary transition-colors rounded-full hover:bg-slate-50"
          title={mode === PlaybackMode.LOOP ? "列表循环" : mode === PlaybackMode.SINGLE ? "单曲循环" : "随机播放"}
        >
          {mode === PlaybackMode.LOOP && <Repeat size={20} />}
          {mode === PlaybackMode.SINGLE && <Repeat1 size={20} />}
          {mode === PlaybackMode.SHUFFLE && <Shuffle size={20} />}
        </button>

        <button onClick={togglePlaylist} className={`p-2 rounded-full transition-colors ${playerState.showPlaylist ? 'text-primary bg-blue-50' : 'text-slate-400 hover:text-primary hover:bg-slate-50'}`}>
          <ListMusic size={20} />
        </button>

        <div className="flex items-center gap-2 group mx-2">
          <button onClick={() => changeVolume(volume === 0 ? 0.5 : 0)} className="text-slate-400 hover:text-primary transition-colors">
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="w-20">
             <ProgressBar
                current={volume}
                max={1}
                onChange={changeVolume}
                className="h-1"
                color="bg-slate-400 group-hover:bg-primary"
                trackColor="bg-slate-200"
            />
          </div>
        </div>

        <button onClick={toggleFullPlayer} className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-50 rounded-full">
            {isFullPlayerOpen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>
        </>
      )}
    </div>
  );
};

export default BottomPlayer;
