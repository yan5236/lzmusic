import React from 'react';

/**
 * 黑胶唱片组件属性接口
 */
interface TurntableProps {
  isPlaying: boolean;
  coverUrl?: string;
}

/**
 * 唱臂组件属性接口
 */
interface ToneArmProps {
  isPlaying: boolean;
}

/**
 * 唱臂组件
 * 根据播放状态显示不同的位置
 */
const ToneArm: React.FC<ToneArmProps> = ({ isPlaying }) => {
  // 旋转角度逻辑:
  // -25deg: 停止位置(向外)
  // 18deg: 播放位置(向内,放在唱片上)
  const rotation = isPlaying ? 18 : -25;

  return (
    <div
      className="absolute top-0 right-0 w-full h-full"
      style={{
        // 旋转中心点相对于容器(w-32 h-32)的位置
        transformOrigin: '96px 25px',
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* 唱臂组件的所有部件定位在旋转中心点 */}
      <div className="absolute top-[25px] left-[96px] w-0 h-0">

        {/* 配重(从旋转中心向后/上延伸) */}
        <div className="absolute -top-10 -left-3 w-6 h-12 bg-neutral-400 rounded-sm shadow-lg border-l border-neutral-500 z-10" />

        {/* 旋转基座(旋转中心的视觉圆形) */}
        <div className="absolute w-14 h-14 bg-neutral-300 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_8px_rgba(0,0,0,0.3)] transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center border border-neutral-400">
           <div className="w-10 h-10 bg-neutral-200 rounded-full border border-neutral-400 shadow-inner" />
           {/* 螺丝细节 */}
           <div className="absolute w-2 h-2 bg-neutral-500 rounded-full opacity-50" />
        </div>

        {/* 唱臂管(从旋转中心向下延伸) */}
        <div className="absolute top-0 left-0 w-3 h-52 md:h-60 bg-gradient-to-r from-neutral-300 via-neutral-100 to-neutral-300 transform -translate-x-1/2 origin-top z-10 shadow-md rounded-b-sm">

           {/* 唱头(连接在唱臂末端) */}
           <div className="absolute bottom-0 left-1/2 w-0 h-0">
              {/* 唱头相对唱臂有一定角度,形成正确的循迹角 */}
              <div
                className="absolute -left-4 top-0 w-8 h-14 bg-neutral-800 rounded-sm shadow-md"
                style={{ transform: 'rotate(25deg)', transformOrigin: 'top center' }}
              >
                 {/* 唱针外壳(位于唱头下方) */}
                 <div className="absolute bottom-0 left-1/2 w-5 h-6 bg-amber-700 transform -translate-x-1/2 translate-y-1/2 rounded-sm border border-amber-800 shadow-sm" />
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

/**
 * 黑胶唱片转盘组件
 * 仅包含唱片和唱臂,无底座和指示灯
 */
export const Turntable: React.FC<TurntableProps> = ({ isPlaying, coverUrl }) => {
  const hasCover = Boolean(coverUrl && coverUrl.trim() !== '');

  return (
    <div className="relative w-full max-w-[350px] md:max-w-[400px] aspect-square">
      {/* 唱片底盘(唱片下方的圆形部分) */}
      <div className="absolute inset-0 bg-neutral-900 rounded-full shadow-inner flex items-center justify-center border border-neutral-800">

        {/* 黑胶唱片 */}
        <div
          className="relative w-[90%] h-[90%] rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden"
          style={{
            animation: 'spin-slow 4s linear infinite',
            animationPlayState: isPlaying ? 'running' : 'paused'
          }}
        >
          {/* 唱片纹理(唱片槽) */}
          <div className="absolute inset-0 vinyl-grooves rounded-full" />

          {/* 唱片光泽反射效果(随唱片一起旋转更真实) */}
          <div className="absolute inset-0 vinyl-sheen rounded-full opacity-30" />

          {/* 中心标签(显示封面) */}
          <div className="absolute inset-0 m-auto w-1/3 h-1/3 bg-amber-500 rounded-full shadow-md flex items-center justify-center border-4 border-neutral-900/20 overflow-hidden">
             {/* 专辑封面或占位图 */}
             {hasCover ? (
               <img
                 src={coverUrl}
                 alt="Album Cover"
                 className="w-full h-full object-cover opacity-90"
               />
             ) : (
               <div className="w-full h-full bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300 flex items-center justify-center text-amber-700/70">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-8 h-8"
                  >
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
               </div>
             )}
             {/* 主轴孔(中心黑色圆点) */}
             <div className="absolute w-3 h-3 bg-black rounded-full border border-neutral-700 z-10" />
          </div>
        </div>
      </div>

      {/* 唱臂组件 - 定位在右上角 */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 w-32 h-32 z-20 pointer-events-none">
        <ToneArm isPlaying={isPlaying} />
      </div>
    </div>
  );
};

export default Turntable;
