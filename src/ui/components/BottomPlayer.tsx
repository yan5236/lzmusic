import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Maximize2, VolumeX, Minimize2, Repeat, Repeat1, Shuffle } from 'lucide-react';
import { PlaybackMode } from '../types';
import type { Song, PlayerState } from '../types';
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

  if (!currentSong) {
    return (
      <div className="h-24 w-full bg-white border-t border-slate-200 flex items-center justify-center text-slate-400 fixed bottom-0 z-[60]">
        <span className="text-sm">准备播放</span>
      </div>
    );
  }

  return (
    <div className="h-24 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 flex items-center justify-between px-6 fixed bottom-0 left-0 z-[60] shadow-[0_-8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">

      {/* Left: Song Info */}
      <div className="flex items-center gap-4 w-[250px] flex-shrink-0 mr-4">
        <div className="relative group">
          <img
            src={currentSong.coverUrl}
            alt={currentSong.title}
            className={`w-14 h-14 rounded-lg object-cover shadow-md border border-slate-100 ${isPlaying ? 'animate-pulse' : ''}`}
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
    </div>
  );
};

export default BottomPlayer;
