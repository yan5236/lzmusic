export type TrayControlAction =
  | 'toggle-play'
  | 'next'
  | 'prev'
  | 'open-playlist'
  | 'show-main'
  | 'quit-app';

export type TrayPlayerState = {
  title: string;
  artist: string;
  coverUrl?: string;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
};

export const defaultTrayState: TrayPlayerState = {
  title: '未在播放',
  artist: '右键托盘可以控制播放',
  coverUrl: '',
  isPlaying: false,
  duration: 0,
  currentTime: 0,
};
