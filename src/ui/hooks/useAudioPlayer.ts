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
  /** 音频元数据加载完成，获取到实际时长 */
  onDurationChange?: (duration: number) => void;
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

  // AbortController用于取消正在进行的播放请求
  const playAbortControllerRef = useRef<AbortController | null>(null);

  // 主动停止标志,用于区分主动清空音频源还是播放错误
  const isStoppingRef = useRef<boolean>(false);

  // 使用useRef存储callbacks，避免依赖变化导致函数重新创建
  const callbacksRef = useRef<AudioPlayerCallbacks>(callbacks);
  
  // loadAndPlay函数的引用，用于在事件处理函数中调用
  const loadAndPlayRef = useRef<((song: Song, startTime?: number) => Promise<void>) | null>(null);
  
  // 上次尝试恢复播放的时间戳
  const lastErrorTimeRef = useRef<number>(0);

  // 每次渲染时更新callbacksRef
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  /**
   * 初始化音频元素
   */
  useEffect(() => {
    // 创建Audio实例
    const audio = new Audio();

    // 设置音频属性
    audio.preload = 'auto';
    // 注意：不设置 crossOrigin，让浏览器根据资源类型自动处理
    // 本地文件不需要跨域，在线资源会在加载时单独设置

    audioRef.current = audio;

    // 清理函数
    return () => {
      // 取消进行中的播放请求
      if (playAbortControllerRef.current) {
        playAbortControllerRef.current.abort();
        playAbortControllerRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  /**
   * 绑定音频事件监听器
   * 使用callbacksRef避免依赖变化导致事件监听器重新绑定
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 播放事件
    const handlePlay = () => {
      callbacksRef.current.onPlayStateChange?.(true);
    };

    // 暂停事件
    const handlePause = () => {
      callbacksRef.current.onPlayStateChange?.(false);
    };

    // 时间更新事件
    const handleTimeUpdate = () => {
      callbacksRef.current.onTimeUpdate?.(audio.currentTime);
    };

    // 播放结束事件
    const handleEnded = () => {
      callbacksRef.current.onEnded?.();
    };

    // 音量改变事件
    const handleVolumeChange = () => {
      callbacksRef.current.onVolumeChange?.(audio.volume);
    };

    // 元数据加载完成事件（获取实际时长）
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        callbacksRef.current.onDurationChange?.(audio.duration);
      }
    };

    // 错误事件
    const handleError = () => {
      const error = audio.error;

      // 如果是主动停止操作,直接忽略错误事件
      if (isStoppingRef.current) {
        console.log('主动停止播放,忽略错误事件');
        return;
      }

      // 如果 src 为空，说明是主动清空的（stop操作），不应该触发错误处理
      if (!audio.src || audio.src === '') {
        console.log('音频源已清空，忽略错误事件');
        return;
      }

      console.error('音频播放错误:', error);

      // 检查是否是 PIPELINE_ERROR_READ 错误（通常发生在暂停很久后恢复播放时）
      const isPipelineError = error && (
        (error.code === 2) || // MEDIA_ERR_NETWORK
        (error.message && error.message.includes('PIPELINE_ERROR_READ'))
      );

      if (isPipelineError && currentSongRef.current) {
        const now = Date.now();
        // 如果距离上次错误超过2秒，或者是不同的歌曲（这里简单通过时间判断），尝试恢复
        // 实际上如果是不同的歌曲，loadAndPlay会被调用，lastErrorTimeRef应该没什么影响，除非切歌很快且立即出错
        if (now - lastErrorTimeRef.current > 2000) {
          console.log('检测到管道错误，尝试恢复播放...');
          lastErrorTimeRef.current = now;
          
          if (loadAndPlayRef.current) {
            const currentTime = audio.currentTime;
            // 重新加载并跳转到出错前的位置
            loadAndPlayRef.current(currentSongRef.current, currentTime).catch(e => {
              console.error('恢复播放失败:', e);
            });
            // 返回，暂不触发后续错误处理
            return;
          }
        }
      }

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
            callbacksRef.current.onError?.(finalError);
          }
        });
      } else {
        // 所有URL都失败了
        const finalError = new Error(
          error?.message || '音频加载失败,将自动跳到下一首'
        );
        callbacksRef.current.onError?.(finalError);
      }
    };

    // 添加事件监听
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    // 清理事件监听
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, []); // 空依赖数组，只在组件挂载时绑定一次

  /**
   * 加载并播放歌曲
   */
  const loadAndPlay = useCallback(async (song: Song, startTime: number = 0) => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio元素未初始化');
      return;
    }

    try {
      // 取消前一个播放请求，防止播放冲突
      if (playAbortControllerRef.current) {
        playAbortControllerRef.current.abort();
      }

      // 暂停当前播放
      audio.pause();

      // 重置停止标志,因为这是加载新歌曲
      isStoppingRef.current = false;

      // 清空旧的备用URL，防止错误处理器使用过时的URL
      backupUrlsRef.current = [];
      currentUrlIndexRef.current = 0;

      // 保存当前歌曲信息
      currentSongRef.current = song;

      // 处理本地歌曲
      if (song.source === 'local') {
        console.log(`播放本地歌曲: ${song.title}`);

        // 本地歌曲直接使用 localmusic:// 协议
        // ID 格式为 local_{trackId}，需要获取实际的文件路径
        const trackId = song.id.replace('local_', '');
        console.log('trackId:', trackId);
        const trackData = await window.electron.invoke('local-music-get-track-by-id', trackId);
        console.log('trackData:', trackData);
        const filePath = trackData.data?.file_path;

        if (!trackData.success || !filePath) {
          const error = new Error(`无法播放"${song.title}"：找不到文件路径`);
          console.error('本地歌曲路径获取失败:', error);
          callbacksRef.current.onError?.(error);
          throw error;
        }

        // 使用 localmusic:// 协议加载本地文件
        const localMusicUrl = `localmusic://${encodeURIComponent(filePath)}`;
        console.log('原始文件路径:', filePath);
        console.log('生成的音频 URL:', localMusicUrl);
        audio.src = localMusicUrl;

        // 重置播放进度
        audio.currentTime = startTime;

        // 等待音频数据加载完成再播放
        // 创建 Promise 确保音频元数据加载完成
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(new Error('音频加载失败'));
          };
          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('error', onError, { once: true });
          // 开始加载
          audio.load();
        });

        // 播放音频
        try {
          await audio.play();
          console.log('本地音频播放开始');
        } catch (playError) {
          if ((playError as DOMException).name === 'AbortError') {
            console.log('播放被中止');
            return;
          }
          throw playError;
        }

        return;
      }

      // 处理 Bilibili 歌曲
      if (!song.bvid || !song.cid) {
        throw new Error('歌曲缺少必要的bvid或cid信息');
      }

      // 创建新的AbortController用于此次播放请求
      playAbortControllerRef.current = new AbortController();
      const currentAbortController = playAbortControllerRef.current;

      // 调用IPC获取音频流URL
      console.log(`获取音频流URL: bvid=${song.bvid}, cid=${song.cid}`);
      const audioUrlData: AudioUrlResponse = await window.electron.invoke(
        'get-audio-url',
        song.bvid,
        song.cid
      );

      // 检查是否被中止
      if (currentAbortController.signal.aborted) {
        console.log('播放请求已被取消');
        return;
      }

      console.log('成功获取音频流URL:', audioUrlData.url);

      // 保存备用URLs
      backupUrlsRef.current = audioUrlData.backup_urls;
      currentUrlIndexRef.current = 0;

      // Bilibili 音频需要设置跨域
      audio.crossOrigin = 'anonymous';

      // 设置音频源
      audio.src = audioUrlData.url;

      // 重置播放进度
      audio.currentTime = startTime;

      // 播放音频（异步操作，需要等待）
      try {
        await audio.play();
        console.log('音频播放开始');
      } catch (playError) {
        // 如果是因为请求被中止导致的错误，不需要处理
        if ((playError as DOMException).name === 'AbortError') {
          console.log('播放被中止');
          return;
        }
        throw playError;
      }
    } catch (error) {
      console.error('加载音频失败:', error);
      const errorMsg = error instanceof Error ? error : new Error(String(error));
      callbacksRef.current.onError?.(errorMsg);
    }
  }, []); // 空依赖数组，使用callbacksRef避免重新创建

  // 更新 loadAndPlayRef，在 loadAndPlay 定义之后
  useEffect(() => {
    loadAndPlayRef.current = loadAndPlay;
  }, [loadAndPlay]);

  /**
   * 播放
   * 如果是网络歌曲且URL已失效（缓存过期），会自动重新获取URL后播放
   */
  const play = useCallback(async () => {
    const audio = audioRef.current;
    const currentSong = currentSongRef.current;

    if (!audio) {
      console.warn('Audio元素未初始化');
      return;
    }

    // 如果没有音频源，检查是否有当前歌曲信息，尝试重新加载
    if (!audio.src && currentSong) {
      console.log('音频源为空但有当前歌曲信息，尝试重新加载');
      await loadAndPlay(currentSong);
      return;
    }

    if (!audio.src) {
      console.warn('没有可播放的音频');
      return;
    }

    try {
      await audio.play();
    } catch (error) {
      console.error('播放失败:', error);

      // 如果是网络歌曲（非本地歌曲）且播放失败，尝试重新获取URL
      if (currentSong && currentSong.source !== 'local') {
        console.log('网络歌曲播放失败，可能是URL已过期，尝试重新获取');
        try {
          await loadAndPlay(currentSong);
          return;
        } catch (reloadError) {
          console.error('重新加载失败:', reloadError);
          callbacksRef.current.onError?.(reloadError instanceof Error ? reloadError : new Error(String(reloadError)));
          return;
        }
      }

      callbacksRef.current.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [loadAndPlay]); // 添加 loadAndPlay 依赖

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

  /**
   * 停止播放并清空音频源
   * 注意：保留 currentSongRef 引用，以便再次点击同一首歌时能正确识别
   */
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 取消进行中的播放请求
    if (playAbortControllerRef.current) {
      playAbortControllerRef.current.abort();
      playAbortControllerRef.current = null;
    }

    // 在暂停前设置停止标志,防止触发错误处理
    isStoppingRef.current = true;

    audio.pause();
    audio.src = '';
    audio.currentTime = 0;

    // 清空备用URL，防止错误处理器在清空src后触发重试
    backupUrlsRef.current = [];
    currentUrlIndexRef.current = 0;

    // 使用 setTimeout 确保错误事件处理完成后再重置标志
    // 100ms 足够处理所有异步错误事件
    setTimeout(() => {
      isStoppingRef.current = false;
    }, 100);

    // 不清空 currentSongRef.current，保留引用用于后续判断
  }, []);

  /**
   * 获取当前加载的歌曲（不管是否在播放）
   */
  const getCurrentSong = useCallback(() => {
    return currentSongRef.current;
  }, []);

  return {
    loadAndPlay,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    getPlayState,
    stop,
    getCurrentSong,
  };
}
