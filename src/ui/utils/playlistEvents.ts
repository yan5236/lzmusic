/**
 * 歌单事件管理模块
 * 用于在歌单数据变化时通知相关组件刷新
 */

// 事件类型
export type PlaylistEventType = 'playlist-updated' | 'playlist-created' | 'playlist-deleted';

// 事件监听器类型
type PlaylistEventListener = () => void;

// 存储所有监听器
const listeners: Map<PlaylistEventType, Set<PlaylistEventListener>> = new Map();

/**
 * 订阅歌单事件
 * @param eventType 事件类型
 * @param listener 监听器函数
 * @returns 取消订阅的函数
 */
export function subscribePlaylistEvent(
  eventType: PlaylistEventType,
  listener: PlaylistEventListener
): () => void {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
  }

  listeners.get(eventType)!.add(listener);

  // 返回取消订阅函数
  return () => {
    listeners.get(eventType)?.delete(listener);
  };
}

/**
 * 发布歌单事件
 * @param eventType 事件类型
 */
export function emitPlaylistEvent(eventType: PlaylistEventType): void {
  const eventListeners = listeners.get(eventType);
  if (eventListeners) {
    eventListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('歌单事件处理出错:', error);
      }
    });
  }
}

/**
 * 便捷方法：触发歌单更新事件
 * 在添加/删除歌曲、修改歌单信息后调用
 */
export function notifyPlaylistUpdated(): void {
  emitPlaylistEvent('playlist-updated');
}

/**
 * 便捷方法：触发歌单创建事件
 */
export function notifyPlaylistCreated(): void {
  emitPlaylistEvent('playlist-created');
  // 创建歌单也算是更新
  emitPlaylistEvent('playlist-updated');
}

/**
 * 便捷方法：触发歌单删除事件
 */
export function notifyPlaylistDeleted(): void {
  emitPlaylistEvent('playlist-deleted');
  // 删除歌单也算是更新
  emitPlaylistEvent('playlist-updated');
}
