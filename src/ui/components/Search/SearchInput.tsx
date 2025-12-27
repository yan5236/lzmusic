/**
 * 搜索输入框组件
 */
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  showSuggestions: boolean;
  onSuggestionClick: (suggestion: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export default function SearchInput({
  value,
  onChange,
  suggestions,
  showSuggestions,
  onSuggestionClick,
  onFocus,
  onBlur,
}: SearchInputProps) {
  return (
    <div className="w-full max-w-4xl mx-auto mb-10 pt-4 relative">
      <input
        type="text"
        placeholder="搜索B站音乐视频..."
        className="w-full bg-white border border-slate-200 rounded-full py-4 px-6 text-slate-900 text-lg focus:ring-2 focus:ring-primary focus:outline-none shadow-lg placeholder:text-slate-400"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-6 py-3 hover:bg-slate-50 cursor-pointer transition-colors text-slate-700 border-b border-slate-100 last:border-0"
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
