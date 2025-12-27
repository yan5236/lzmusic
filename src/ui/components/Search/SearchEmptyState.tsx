/**
 * 搜索空状态组件
 */
interface SearchEmptyStateProps {
  hasSearchQuery: boolean;
}

export default function SearchEmptyState({ hasSearchQuery }: SearchEmptyStateProps) {
  const SearchIconPlaceholder = () => (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-200"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );

  if (hasSearchQuery) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <SearchIconPlaceholder />
        <p className="text-lg mt-4">未找到相关结果</p>
        <p className="text-sm text-slate-400 mt-2">试试其他关键词吧</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <SearchIconPlaceholder />
      <p className="text-lg mt-4">输入关键词开始搜索...</p>
    </div>
  );
}
