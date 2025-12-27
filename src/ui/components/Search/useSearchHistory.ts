import { useState, useEffect, useCallback } from 'react';
import { hasIpcInvoke } from './utils';

/**
 * 搜索历史管理 Hook
 */
export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  /**
   * 保存搜索历史到本地存储
   */
  const persistLocalHistory = useCallback((history: string[]) => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('searchHistory', JSON.stringify(history.slice(0, 10)));
    } catch (err) {
      console.error('保存搜索历史到本地失败:', err);
    }
  }, []);

  /**
   * 从本地存储加载搜索历史
   */
  const loadLocalHistory = useCallback((): string[] => {
    if (typeof localStorage === 'undefined') return [];

    try {
      const storedHistory = localStorage.getItem('searchHistory');
      if (storedHistory) {
        const parsed: unknown = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 10);
        }
      }
    } catch (err) {
      console.error('加载本地搜索历史失败:', err);
    }

    return [];
  }, []);

  /**
   * 保存搜索历史到数据库
   */
  const saveSearchHistoryToDb = useCallback(async (term: string) => {
    const invoke = hasIpcInvoke() ? window.electron.invoke : null;
    if (!invoke) return;

    try {
      await invoke('app-db-search-history-add', term);
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }
  }, []);

  /**
   * 清空数据库中的搜索历史
   */
  const clearSearchHistoryInDb = useCallback(async () => {
    const invoke = hasIpcInvoke() ? window.electron.invoke : null;
    if (!invoke) return;

    try {
      await invoke('app-db-search-history-clear');
    } catch (error) {
      console.error('清空搜索历史失败:', error);
    }
  }, []);

  /**
   * 加载搜索历史(优先从数据库加载)
   */
  const loadSearchHistory = useCallback(async () => {
    const hasIpc = hasIpcInvoke();

    if (hasIpc) {
      try {
        const result = await window.electron.invoke('app-db-search-history-get');
        if (result.success && Array.isArray(result.data)) {
          const history = result.data.slice(0, 10);
          if (history.length > 0) {
            persistLocalHistory(history);
            return history;
          }
        }
      } catch (error) {
        console.error('加载搜索历史失败:', error);
      }
    }

    const localHistory = loadLocalHistory();
    if (localHistory.length && hasIpc) {
      localHistory.forEach((term) => {
        void saveSearchHistoryToDb(term);
      });
    }
    persistLocalHistory(localHistory);
    return localHistory;
  }, [loadLocalHistory, persistLocalHistory, saveSearchHistoryToDb]);

  /**
   * 初始化加载搜索历史
   */
  useEffect(() => {
    const initHistory = async () => {
      const history = await loadSearchHistory();
      setSearchHistory(history);
    };

    void initHistory();
  }, [loadSearchHistory]);

  /**
   * 添加关键词到搜索历史
   */
  const addToHistory = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;

      setSearchHistory((prev) => {
        const nextHistory = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 10);
        persistLocalHistory(nextHistory);
        return nextHistory;
      });

      void saveSearchHistoryToDb(trimmed);
    },
    [persistLocalHistory, saveSearchHistoryToDb]
  );

  /**
   * 清空搜索历史
   */
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    persistLocalHistory([]);
    void clearSearchHistoryInDb();
  }, [persistLocalHistory, clearSearchHistoryInDb]);

  return {
    searchHistory,
    addToHistory,
    clearHistory,
  };
}
