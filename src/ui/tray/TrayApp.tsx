import { useEffect, useMemo, useState } from 'react';

type TrayControlAction = 'toggle-play' | 'next' | 'prev' | 'open-playlist' | 'show-main' | 'quit-app';

type TrayState = {
  title: string;
  artist: string;
  coverUrl?: string;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
};

const defaultState: TrayState = {
  title: '未在播放',
  artist: '右键托盘可以控制播放',
  coverUrl: '',
  isPlaying: false,
  duration: 0,
  currentTime: 0,
};

const formatTime = (val: number) => {
  const v = Math.max(0, Math.floor(val));
  const m = String(Math.floor(v / 60)).padStart(2, '0');
  const s = String(v % 60).padStart(2, '0');
  return `${m}:${s}`;
};

function TrayApp() {
  const [trayState, setTrayState] = useState<TrayState>(defaultState);

  useEffect(() => {
    const unsubscribe = window.electron?.onTrayState?.((incoming) => {
      if (!incoming) return;
      setTrayState((prev) => ({
        ...prev,
        ...incoming,
        title: incoming.title ?? prev.title,
        artist: incoming.artist ?? prev.artist,
        coverUrl: incoming.coverUrl ?? prev.coverUrl,
        isPlaying: incoming.isPlaying ?? prev.isPlaying,
        duration: incoming.duration ?? prev.duration,
        currentTime: incoming.currentTime ?? prev.currentTime,
      }));
    });

    return () => unsubscribe?.();
  }, []);

  const progress = useMemo(() => {
    const duration = Number(trayState.duration || 0);
    const current = Math.min(Number(trayState.currentTime || 0), duration);
    if (duration <= 0) return 0;
    return Math.min(100, Math.max(0, (current / duration) * 100));
  }, [trayState.currentTime, trayState.duration]);

  const handleControl = (action: TrayControlAction) => {
    window.electron?.sendTrayControl?.(action);
  };

  return (
    <div className="w-[320px] bg-gradient-to-br from-[#eaf1ff] via-[#f6f9ff] to-white p-3 rounded-2xl shadow-xl border border-[#dbe6ff] text-slate-800 overflow-hidden">
      <div className="flex items-center justify-between text-xs text-slate-500 tracking-[0.12em] uppercase app-drag">
        <span className="font-semibold text-blue-700">LZMusic</span>
        
      </div>

      <div className="mt-3 grid gap-3 app-no-drag">
        <div className="rounded-2xl bg-white/90 border border-[#dbe6ff] shadow-sm p-3 flex gap-3 items-center">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#c8d9ff] bg-gradient-to-br from-[#d7e6ff] to-[#f0f5ff] flex items-center justify-center">
            {trayState.coverUrl ? (
              <img src={trayState.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs text-slate-500 font-semibold">No Cover</div>
            )}
            <div className="absolute inset-0 rounded-xl shadow-[inset_0_1px_6px_rgba(255,255,255,0.65)] pointer-events-none" />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="text-[11px] uppercase font-semibold text-blue-700 tracking-[0.08em]">Now Playing</div>
            <div className="text-base font-semibold truncate text-slate-900">{trayState.title || '未在播放'}</div>
            <div className="text-sm text-slate-600 truncate">{trayState.artist || '等待播放歌曲'}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-semibold">
                {trayState.isPlaying ? '播放中' : '已暂停'}
              </span>
              <span className="ml-auto">{`${formatTime(trayState.currentTime)} / ${formatTime(trayState.duration)}`}</span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-150 ease-out shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 border border-[#dbe6ff] shadow-sm p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              className="h-10 rounded-xl bg-slate-50 border border-[#dbe6ff] hover:-translate-y-[1px] hover:shadow-md transition text-slate-800 font-semibold"
              onClick={() => handleControl('prev')}
            >
              上一首
            </button>
            <button
              className="h-10 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white font-semibold border border-[#1d64f2] shadow-md hover:shadow-lg hover:-translate-y-[1px] transition"
              onClick={() => handleControl('toggle-play')}
            >
              {trayState.isPlaying ? '暂停' : '播放'}
            </button>
            <button
              className="h-10 rounded-xl bg-slate-50 border border-[#dbe6ff] hover:-translate-y-[1px] hover:shadow-md transition text-slate-800 font-semibold"
              onClick={() => handleControl('next')}
            >
              下一首
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-10 rounded-xl bg-white border border-[#dbe6ff] text-slate-800 font-semibold hover:-translate-y-[1px] hover:shadow-md transition"
              onClick={() => handleControl('open-playlist')}
            >
              播放列表
            </button>
            <button
              className="h-10 rounded-xl bg-rose-50 border border-[#f2b8b5] text-rose-700 font-semibold hover:-translate-y-[1px] hover:shadow-md transition"
              onClick={() => handleControl('quit-app')}
            >
              退出
            </button>
          </div>

          <button
            className="w-full h-10 rounded-xl bg-slate-900 text-white font-semibold hover:-translate-y-[1px] hover:shadow-lg transition"
            onClick={() => handleControl('show-main')}
          >
            返回主界面
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrayApp;
