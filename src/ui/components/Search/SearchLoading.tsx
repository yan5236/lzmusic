import { Loader2 } from 'lucide-react';

/**
 * 搜索加载状态组件
 */
export default function SearchLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 size={48} className="text-primary animate-spin" />
      <p className="text-lg mt-4">正在搜索...</p>
    </div>
  );
}
