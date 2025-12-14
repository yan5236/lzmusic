import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * 使用前须知协议内容
 * 包含开源许可、数据来源说明、版权与使用责任等重要信息
 */
const AGREEMENT_CONTENT = `## 使用前须知（重要）

欢迎使用 **lzmusic**。在使用本软件前,请您务必仔细阅读并充分理解以下内容。一旦使用本软件,即视为您已阅读并同意本须知的全部条款。

### 一、开源与许可

1. 本软件为**完全开源项目**,遵循 **GNU General Public License v3.0（GPL-3.0）** 开源协议发布。
2. 您可以在遵守 GPL-3.0 协议的前提下自由地使用、修改和分发本软件源码。
3. 本项目不提供任何形式的担保,包括但不限于对适用性、稳定性、合法性的担保。

### 二、数据来源说明

1. 本软件**本身不存储、不制作、不分发任何音乐版权内容**。
2. 软件中涉及的音乐音频数据,均来源于：

   * **哔哩哔哩公开 API**
     项目参考：https://github.com/SocialSisterYi/bilibili-API-collect
3. 软件中涉及的歌词数据,来源于：

   * **网易云音乐 API 依赖项目**
     项目参考：https://github.com/Binaryify/NeteaseCloudMusicApi
4. 所有数据均由第三方平台通过其公开接口提供,其版权及相关权利**归原权利人或对应平台所有**。

### 三、版权与使用责任

1. 本项目**不拥有、不主张、不转让任何音乐或歌词内容的版权**。
2. 本软件仅作为**技术研究与学习交流用途**,不保证所获取数据的合法性、完整性或可持续性。
3. 使用者在使用本软件过程中获取的任何可能涉及版权的内容,应在 **24 小时内自行删除**。
4. 因使用本软件而产生的任何版权纠纷、法律责任或其他风险,**均由使用者本人自行承担**,与本项目作者及贡献者无关。

### 四、商业用途限制

1. **严禁将本软件及其衍生版本用于任何形式的商业用途**,包括但不限于：

   * 盈利性产品
   * 商业发行
   * 广告、付费服务
   * 与商业行为直接或间接相关的场景
2. 因违反上述限制而产生的一切后果,由使用者自行承担。

### 五、其他说明

1. 本项目作者有权在不另行通知的情况下,对本软件内容及本须知进行修改。
2. 若您不同意上述任一条款,请**立即停止使用并删除本软件**。
`;

interface AgreementDialogProps {
  open: boolean;
  onAccept: () => void;
  onExit: () => void;
}

/**
 * 使用前须知对话框组件
 * 首次启动时显示,需等待 30 秒后才能同意并进入
 */
const AgreementDialog = ({ open, onAccept, onExit }: AgreementDialogProps) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!open) return;

    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              Notice
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">使用前须知</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                首次启动必读
              </span>
            </div>
            <p className="text-sm text-slate-500">
              请先阅读以下协议内容，等待 30 秒后才能进入应用。
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 text-slate-800 leading-relaxed hide-scrollbar">
          <div className="markdown-content text-sm bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-inner prose prose-sm max-w-none prose-headings:text-slate-900 prose-h2:text-lg prose-h2:font-bold prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1.5 prose-p:my-1 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-slate-900 prose-strong:font-semibold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown>{AGREEMENT_CONTENT}</ReactMarkdown>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-500">
            为保障知情权，{countdown > 0 ? `请等待 ${countdown} 秒后再进入。` : '您已可以进入应用。'}
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={onExit}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              退出
            </button>
            <button
              onClick={onAccept}
              disabled={countdown > 0}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                countdown > 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              {countdown > 0 ? `同意并进入 (${countdown}s)` : '同意并进入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgreementDialog;
