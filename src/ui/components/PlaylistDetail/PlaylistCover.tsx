import { Music, Camera } from 'lucide-react';

/**
 * 歌单封面展示与替换入口组件
 */

interface PlaylistCoverProps {
  coverUrl?: string;
  alt: string;
}

export default function PlaylistCover({ coverUrl, alt }: PlaylistCoverProps) {
  return (
    <div className="relative group">
      <div className="w-48 h-48 rounded-xl overflow-hidden bg-slate-100 shadow-lg flex-shrink-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={alt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Music size={64} className="text-slate-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="p-3 bg-white rounded-full hover:bg-slate-100">
            <Camera size={24} className="text-slate-700" />
          </button>
        </div>
      </div>
    </div>
  );
}
