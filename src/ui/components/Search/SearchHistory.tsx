/**
 * 搜索历史组件
 */
interface SearchHistoryProps {
  searchHistory: string[];
  onHistoryClick: (term: string) => void;
  onClearHistory: () => void;
  shouldShow: boolean;
}

export default function SearchHistory({
  searchHistory,
  onHistoryClick,
  onClearHistory,
  shouldShow,
}: SearchHistoryProps) {
  if (!shouldShow || searchHistory.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500 font-medium">搜索历史</span>
        <button
          onClick={onClearHistory}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          清除
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searchHistory.map((item) => (
          <button
            key={item}
            onClick={() => onHistoryClick(item)}
            className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm text-slate-600 hover:border-primary hover:text-primary transition-colors shadow-sm"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
