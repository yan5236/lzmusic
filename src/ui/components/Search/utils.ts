import type { Song } from '../../types';
import type { BilibiliVideo } from '../../../shared/types';

/**
 * 解析时长字符串或数字为秒数
 * @param duration 时长字符串(如 "4:18" 或 "1:23:45")或秒数
 * @returns 秒数
 */
export function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration;
  }

  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * 格式化时长为 "分:秒" 格式
 * @param seconds 秒数
 * @returns 格式化后的时长字符串
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 转换 Bilibili 视频为 Song 格式
 * @param video Bilibili视频对象
 * @param selectedCid 选中的分P CID(可选)
 * @returns Song对象
 */
export function convertToSong(video: BilibiliVideo, selectedCid?: number): Song {
  return {
    id: video.bvid,
    title: video.title,
    artist: video.author,
    coverUrl: video.cover,
    duration: parseDuration(video.duration),
    bvid: video.bvid,
    cid: selectedCid || video.cid,
    pages: video.pages,
    source: 'bilibili',
  };
}

/**
 * 检查是否有 IPC invoke 方法可用
 * @returns 是否可用
 */
export function hasIpcInvoke(): boolean {
  return typeof window !== 'undefined' && typeof window.electron?.invoke === 'function';
}
