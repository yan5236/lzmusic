/**
 * 歌单歌曲列表表头组件
 */
export default function SongListHeader() {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 border-b border-slate-100 font-semibold text-slate-500 text-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 text-center">#</div>
        <div className="w-10"></div>
      </div>
      <div>标题</div>
      <div>歌手</div>
      <div className="w-16 text-center">时长</div>
    </div>
  );
}
