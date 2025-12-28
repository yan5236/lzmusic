import React from 'react';
import { Globe, Github } from 'lucide-react';

/**
 * 关于组件
 * 显示官网和 GitHub 链接，点击后在默认浏览器中打开
 */
const AboutSection: React.FC = () => {
  const handleOpenWebsite = async () => {
    try {
      const result = await window.electron.invoke('open-external-url', 'https://lzmusic.nanhaiblog.top') as {
        success: boolean;
        error?: string;
      };
      if (!result.success) {
        console.error(result.error);
      }
    } catch (error) {
      console.error('打开官网失败:', error);
    }
  };

  const handleOpenGitHub = async () => {
    try {
      const result = await window.electron.invoke('open-external-url', 'https://github.com/yan5236/lzmusic') as {
        success: boolean;
        error?: string;
      };
      if (!result.success) {
        console.error(result.error);
      }
    } catch (error) {
      console.error('打开 GitHub 失败:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">关于</h2>
      <p className="text-sm text-slate-500 mb-6">访问官网或 GitHub 查看更多</p>

      <div className="space-y-3">
        <button
          onClick={handleOpenWebsite}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 border border-blue-100"
        >
          <Globe size={20} />
          <span>官网</span>
          <span className="ml-auto text-sm text-blue-600/70">lzmusic.nanhaiblog.top</span>
        </button>

        <button
          onClick={handleOpenGitHub}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 hover:from-slate-100 hover:to-gray-100 border border-slate-200"
        >
          <Github size={20} />
          <span>GitHub</span>
          <span className="ml-auto text-sm text-slate-500/70">yan5236/lzmusic</span>
        </button>
      </div>
    </div>
  );
};

export default AboutSection;
