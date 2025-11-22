/**
 * 歌词设置对话框组件
 * 提供歌词搜索和其他设置功能
 */

import { useState } from 'react';
import { Search, Settings, X } from 'lucide-react';
import type { Song, NeteaseSearchResult } from '../types';

interface LyricsSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  fontSize: number;
  offset: number;
  onFontSizeChange: (size: number) => void;
  onOffsetChange: (offset: number) => void;
  onLyricsApply: (lyrics: string[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

/**
 * 歌词设置对话框组件
 */
export function LyricsSettingsDialog({
  isOpen,
  onClose,
  currentSong,
  fontSize,
  offset,
  onFontSizeChange,
  onOffsetChange,
  onLyricsApply,
  showToast,
}: LyricsSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'settings'>('search');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<NeteaseSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<NeteaseSearchResult | null>(null);
  const [previewLyrics, setPreviewLyrics] = useState<string>('');

  // 临时设置值
  const [tempFontSize, setTempFontSize] = useState(fontSize);
  const [tempOffset, setTempOffset] = useState(offset);

  // 当对话框打开时,自动填充当前歌曲信息
  useState(() => {
    if (isOpen && currentSong) {
      setSearchKeyword(`${currentSong.title} ${currentSong.artist}`);
    }
  });

  // 搜索歌曲
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedResult(null);
    setPreviewLyrics('');

    try {
      const result = await window.electron.invoke('netease-search-song', searchKeyword);

      if (result.success) {
        setSearchResults(result.data);
      } else {
        showToast(`搜索失败: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('搜索错误:', error);
      showToast('搜索失败,请稍后重试', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // 预览歌词
  const handlePreviewLyrics = async (result: NeteaseSearchResult) => {
    setSelectedResult(result);
    setPreviewLyrics('加载中...');

    try {
      const lyricsResult = await window.electron.invoke('netease-get-lyrics', result.id);

      if (lyricsResult.success && lyricsResult.data.lrc) {
        setPreviewLyrics(lyricsResult.data.lrc);
      } else {
        setPreviewLyrics('该歌曲暂无歌词');
      }
    } catch (error) {
      console.error('获取歌词错误:', error);
      setPreviewLyrics('获取歌词失败');
    }
  };

  // 应用歌词
  const handleApplyLyrics = async () => {
    if (!previewLyrics || previewLyrics === '加载中...' || previewLyrics === '该歌曲暂无歌词') {
      return;
    }

    // 解析LRC格式歌词
    const lines = previewLyrics.split('\n');
    const lyricsArray: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // 过滤掉空行和元数据行
      if (trimmed && trimmed.match(/^\[\d+:\d+\.\d+\]/)) {
        lyricsArray.push(trimmed);
      }
    }

    // 应用到当前播放器
    onLyricsApply(lyricsArray);

    // 保存到数据库
    if (currentSong) {
      try {
        // 使用 bvid 作为唯一标识（B站歌曲）
        // 本地歌曲可以使用 currentSong.id
        const songId = currentSong.bvid || currentSong.id;
        const source = currentSong.bvid ? 'bilibili' : 'local';

        const result = await window.electron.invoke(
          'lyrics-db-save',
          songId,
          lyricsArray,
          source
        );

        if (result.success) {
          showToast('歌词已应用并保存', 'success');
        } else {
          showToast('歌词已应用，但保存失败', 'error');
          console.error('保存歌词失败:', result.error);
        }
      } catch (error) {
        console.error('保存歌词到数据库出错:', error);
        showToast('歌词已应用，但保存失败', 'error');
      }
    } else {
      showToast('歌词已应用', 'success');
    }
  };

  // 应用设置
  const handleApplySettings = () => {
    onFontSizeChange(tempFontSize);
    onOffsetChange(tempOffset);
    showToast('设置已应用', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">歌词设置</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-primary border-b-2 border-primary bg-blue-50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Search size={18} />
              <span>歌词搜索</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-primary border-b-2 border-primary bg-blue-50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Settings size={18} />
              <span>其他设置</span>
            </div>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'search' ? (
            <div className="space-y-4">
              {/* 搜索框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="输入歌曲名和歌手名..."
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSearching ? '搜索中...' : '搜索'}
                </button>
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {/* 左侧:结果列表 */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-700 mb-2">搜索结果</h3>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handlePreviewLyrics(result)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            selectedResult?.id === result.id
                              ? 'bg-primary text-white'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="font-medium truncate">{result.name}</div>
                          <div className="text-sm opacity-80 truncate">
                            {result.artist} · {result.album}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 右侧:歌词预览 */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-700 mb-2">歌词预览</h3>
                    <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {previewLyrics ? (
                        <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">
                          {previewLyrics}
                        </pre>
                      ) : (
                        <p className="text-slate-400 text-center py-8">
                          点击左侧歌曲预览歌词
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 应用按钮 */}
              {previewLyrics && previewLyrics !== '加载中...' && previewLyrics !== '该歌曲暂无歌词' && (
                <div className="flex justify-end">
                  <button
                    onClick={handleApplyLyrics}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    应用歌词
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 字体大小设置 */}
              <div className="space-y-3">
                <label className="block font-semibold text-slate-700">
                  字体大小: {tempFontSize}px
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="12"
                    max="48"
                    step="1"
                    value={tempFontSize}
                    onChange={(e) => setTempFontSize(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <input
                    type="number"
                    min="12"
                    max="48"
                    value={tempFontSize}
                    onChange={(e) => setTempFontSize(Number(e.target.value))}
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center"
                  />
                </div>
                {/* 预览 */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p style={{ fontSize: `${tempFontSize}px` }} className="text-slate-700 text-center">
                    歌词预览效果
                  </p>
                </div>
              </div>

              {/* 歌词偏移设置 */}
              <div className="space-y-3">
                <label className="block font-semibold text-slate-700">
                  歌词偏移: {tempOffset}ms
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="-5000"
                    max="5000"
                    step="100"
                    value={tempOffset}
                    onChange={(e) => setTempOffset(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <input
                    type="number"
                    min="-5000"
                    max="5000"
                    step="100"
                    value={tempOffset}
                    onChange={(e) => setTempOffset(Number(e.target.value))}
                    className="w-28 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center"
                  />
                </div>
                <p className="text-sm text-slate-500">
                  正值表示歌词提前显示,负值表示歌词延后显示
                </p>
              </div>

              {/* 应用按钮 */}
              <div className="flex justify-end">
                <button
                  onClick={handleApplySettings}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  应用设置
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
