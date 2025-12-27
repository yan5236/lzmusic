/**
 * 搜索错误组件
 */
interface SearchErrorProps {
  error: string;
  onRetry: () => void;
}

export default function SearchError({ error, onRetry }: SearchErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-red-500 text-lg mb-2">搜索失败</div>
      <p className="text-sm text-slate-400">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        重试
      </button>
    </div>
  );
}
