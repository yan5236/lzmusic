import React from 'react';
import { Disc, Image } from 'lucide-react';

interface PlaybackStyleCardProps {
  coverStyle: 'normal' | 'vinyl';
  onCoverStyleChange: (style: 'normal' | 'vinyl') => void;
}

const PlaybackStyleCard: React.FC<PlaybackStyleCardProps> = ({ coverStyle, onCoverStyleChange }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
    <h2 className="text-lg font-semibold text-slate-900 mb-4">播放样式</h2>
    <p className="text-sm text-slate-500 mb-6">选择播放界面的封面显示样式</p>

    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onCoverStyleChange('normal')}
        className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
          coverStyle === 'normal'
            ? 'border-primary bg-blue-50 shadow-sm'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center mb-3 ${
            coverStyle === 'normal' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Image size={32} />
        </div>
        <span
          className={`text-sm font-medium ${
            coverStyle === 'normal' ? 'text-primary' : 'text-slate-700'
          }`}
        >
          普通
        </span>
        <span className="text-xs text-slate-400 mt-1">方形封面</span>
      </button>

      <button
        onClick={() => onCoverStyleChange('vinyl')}
        className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
          coverStyle === 'vinyl'
            ? 'border-primary bg-blue-50 shadow-sm'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center mb-3 ${
            coverStyle === 'vinyl' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Disc size={32} />
        </div>
        <span
          className={`text-sm font-medium ${
            coverStyle === 'vinyl' ? 'text-primary' : 'text-slate-700'
          }`}
        >
          黑胶唱片
        </span>
        <span className="text-xs text-slate-400 mt-1">旋转唱片效果</span>
      </button>
    </div>
  </div>
);

export default PlaybackStyleCard;
