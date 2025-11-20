/**
 * 音频播放自定义Hook
 * 使用HTMLAudioElement进行真实音频播放
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Song } from '../types';
import type { AudioUrlResponse } from '../../shared/types';

/**
 * 音频播放事件回调接口
 */
export interface AudioPlayerCallbacks {
  /** 播放状态改变 (播放/暂停) */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** 播放进度更新 */
  onTimeUpdate?: (currentTime: number) => void;
  /** 歌曲播放结束 */
  onEnded?: () => void;
  /** 音频加载错误 */
  onError?: (error: Error) => void;
  /** 音量改变 */
  onVolumeChange?: (volume: number) => void;
}

/**
 * 音频播放器Hook
 */
export function useAudioPlayer(callbacks: AudioPlayerCallbacks = {}) {
  // HTMLAudioElement实例引用
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 当前歌曲信息引用
  const currentSongRef = useRef<Song | null>(null);

  // 备用URL列表引用
  const backupUrlsRef = useRef<string[]>([]);

  // 当前尝试的URL索引
  const currentUrlIndexRef = useRef<number>(0);

  /**
   * 初始化音频元素
   */
  useEffect(() => {
    // 创建Audio实例
    const audio = new Audio();

    // 设置音频属性
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous'; // 处理跨域

    audioRef.current = audio;

    // 清理函数
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  /**
   * 绑定音频事件监听器
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 播放事件
    const handlePlay = () => {
      callbacks.onPlayStateChange?.(true);
    };

    // 暂停事件
    const handlePause = () => {
      callbacks.onPlayStateChange?.(false);
    };

    // 时间更新事件
    const handleTimeUpdate = () => {
      callbacks.onTimeUpdate?.(audio.currentTime);
    };

    // 播放结束事件
    const handleEnded = () => {
      callbacks.onEnded?.();
    };

    // 音量改变事件
    const handleVolumeChange = () => {
      callbacks.onVolumeChange?.(audio.volume);
    };

    // 错误事件
    const handleError = () => {
      const error = audio.error;
      console.error('音频播放错误:', error);

      // 尝试使用备用URL
      if (backupUrlsRef.current.length > 0 && currentUrlIndexRef.current < backupUrlsRef.current.length) {
        console.log(`主URL失败,尝试备用URL ${currentUrlIndexRef.current + 1}/${backupUrlsRef.current.length}`);
        const nextUrl = backupUrlsRef.current[currentUrlIndexRef.current];
        currentUrlIndexRef.current++;

        // 使用备用URL
        audio.src = nextUrl;
        audio.play().catch((err) => {
          console.error('备用URL播放失败:', err);
          // 如果还有备用URL,会自动触发下一次error事件
          // 如果所有URL都失败了,调用错误回调
          if (currentUrlIndexRef.current >= backupUrlsRef.current.length) {
            const finalError = new Error('所有音频流URL都无法播放');
            callbacks.onError?.(finalError);
          }
        });
      } else {
        // 所有URL都失败了
        const finalError = new Error(
          error?.message || '音频加载失败,将自动跳到下一首'
        );
        callbacks.onError?.(finalError);
      }
    };

    // 添加事件监听
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('error', handleError);

    // 清理事件监听
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('error', handleError);
    };
  }, [callbacks]);

  /**
   * 加载并播放歌曲
   */
  const loadAndPlay = useCallback(async (song: Song) => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio元素未初始化');
      return;
    }

    try {
      // 检查必要字段
      if (!song.bvid || !song.cid) {
        throw new Error('歌曲缺少必要的bvid或cid信息');
      }

      // 保存当前歌曲信息
      currentSongRef.current = song;

      // 调用IPC获取音频流URL
      console.log(`获取音频流URL: bvid=${song.bvid}, cid=${song.cid}`);
      const audioUrlData: AudioUrlResponse = await window.electron.invoke(
        'get-audio-url',
        song.bvid,
        song.cid
      );

      console.log('成功获取音频流URL:', audioUrlData.url);

      // 保存备用URLs
      backupUrlsRef.current = audioUrlData.backup_urls;
      currentUrlIndexRef.current = 0;

      // 设置音频源
      audio.src = audioUrlData.url;

      // 播放音频
      await audio.play();
    } catch (error) {
      console.error('加载音频失败:', error);
      const errorMsg = error instanceof Error ? error : new Error(String(error));
      callbacks.onError?.(errorMsg);
    }
  }, [callbacks]);

  /**
   * 播放
   */
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      console.warn('没有可播放的音频');
      return;
    }

    try {
      await audio.play();
    } catch (error) {
      console.error('播放失败:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [callbacks]);

  /**
   * 暂停
   */
  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
  }, []);

  /**
   * 切换播放/暂停
   */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      play();
    } else {
      pause();
    }
  }, [play, pause]);

  /**
   * 跳转到指定时间
   */
  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
  }, []);

  /**
   * 设置音量 (0-1)
   */
  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    // 限制音量范围
    audio.volume = Math.max(0, Math.min(1, volume));
  }, []);

  /**
   * 获取当前播放状态
   */
  const getPlayState = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
      };
    }

    return {
      isPlaying: !audio.paused,
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
      volume: audio.volume,
    };
  }, []);

  return {
    loadAndPlay,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    getPlayState,
  };
}
