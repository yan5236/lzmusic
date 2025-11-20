import React, { useRef } from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
  color?: string;
  trackColor?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  onChange,
  className = '',
  color = 'bg-primary',
  trackColor = 'bg-slate-200'
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.min(Math.max(x / width, 0), 1);
    onChange(percentage * max);
  };

  const percentage = max > 0 ? (current / max) * 100 : 0;

  return (
    <div
      className={`group relative h-1 w-full ${trackColor} rounded-full cursor-pointer flex items-center ${className}`}
      onClick={handleClick}
      ref={progressBarRef}
    >
      <div
        className={`h-full rounded-full ${color} relative`}
        style={{ width: `${percentage}%` }}
      >
         {/* Handle Knob - visible on group hover */}
        <div className="absolute right-[-6px] top-[-4px] w-3 h-3 bg-white border border-slate-200 rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity"></div>
      </div>
    </div>
  );
};

export default ProgressBar;
