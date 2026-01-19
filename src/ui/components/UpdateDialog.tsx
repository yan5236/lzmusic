import React from 'react';
import { Download, Info, Pause, Play, XCircle } from 'lucide-react';
import { Dialog, DialogButton } from './Dialog';
import type { UpdateDownloadState, UpdateInfo, UpdateProgress } from '../types';

interface UpdateDialogProps {
  open: boolean;
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  status: UpdateDownloadState;
  progress: UpdateProgress | null;
  onClose: () => void;
  onIgnore: () => void;
  onDownload: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

function formatReleaseDate(date?: string) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString();
}

function formatBytes(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '--';
  if (value < 1024) return `${value.toFixed(0)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * 清理更新说明中的 HTML 标签，保留可读的换行与列表格式。
 */
function sanitizeReleaseNotes(raw: string) {
  if (!raw) return '';
  const withLineBreaks = raw
    .replace(/\r\n/g, '\n')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\s*p[^>]*>/gi, '')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<\/\s*h\d\s*>/gi, '\n')
    .replace(/<\s*h\d[^>]*>/gi, '')
    .replace(/<\/\s*ul\s*>/gi, '\n')
    .replace(/<\s*ul[^>]*>/gi, '');
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, '');
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return decoded
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({
  open,
  currentVersion,
  updateInfo,
  status,
  progress,
  onClose,
  onIgnore,
  onDownload,
  onPause,
  onResume,
  onCancel,
}) => {
  const isDownloading = status === 'downloading';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isInProgress = isDownloading || isPaused;
  const progressPercent = Math.min(100, Math.max(0, progress?.percent ?? (isCompleted ? 100 : 0)));
  const showRemindLater = !isDownloading || isPaused;
  const showIgnore = !isInProgress;
  const releaseNotes = updateInfo?.notes ? sanitizeReleaseNotes(updateInfo.notes) : '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="发现新版本"
      maxWidth="md"
      actions={(
        <>
          {showRemindLater && (
            <DialogButton onClick={onClose}>
              稍后提醒
            </DialogButton>
          )}
          {showIgnore && (
            <DialogButton onClick={onIgnore} disabled={isCompleted}>
              忽略此版本
            </DialogButton>
          )}
          {isInProgress && (
            <DialogButton onClick={onCancel}>
              <span className="inline-flex items-center gap-2 text-red-600">
                <XCircle size={16} />
                取消下载
              </span>
            </DialogButton>
          )}
          <DialogButton
            variant="primary"
            onClick={isDownloading ? onPause : isPaused ? onResume : onDownload}
            disabled={!updateInfo || isCompleted}
          >
            <span className="inline-flex items-center gap-2">
              {isCompleted ? <Download size={16} /> : isDownloading ? <Pause size={16} /> : isPaused ? <Play size={16} /> : <Download size={16} />}
              {isCompleted
                ? '等待安装'
                : isDownloading
                  ? '暂停下载'
                  : isPaused
                    ? '继续下载'
                    : '下载并安装'}
            </span>
          </DialogButton>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Info size={18} />
          </div>
          <div className="space-y-1 text-slate-700">
            <div className="text-sm">
              当前版本 <span className="font-semibold text-slate-900">{currentVersion ? `v${currentVersion}` : '-'}</span>
            </div>
            <div className="text-sm">
              可用版本 <span className="font-semibold text-blue-600">{updateInfo?.version ? `v${updateInfo.version}` : '-'}</span>
            </div>
            {updateInfo?.releaseDate && (
              <div className="text-xs text-slate-500">
                发布时间 {formatReleaseDate(updateInfo.releaseDate)}
              </div>
            )}
            {status === 'completed' && (
              <div className="text-xs text-emerald-600 font-medium">
                下载完成，退出后将自动安装
              </div>
            )}
          </div>
        </div>

        {(isDownloading || isPaused || isCompleted || progress) && (
          <div className="rounded-lg border border-slate-200 p-4 space-y-2 bg-slate-50">
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span className="font-medium">
                {isCompleted
                  ? '下载完成'
                  : isPaused
                    ? '下载已暂停'
                    : '正在下载更新包'}
              </span>
              <span className="text-slate-500">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full transition-all ${isPaused ? 'bg-amber-400' : 'bg-blue-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                {formatBytes(progress?.transferred)} / {formatBytes(progress?.total)}
              </span>
              {progress?.bytesPerSecond !== undefined && (
                <span>{formatBytes(progress.bytesPerSecond)}/s</span>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-3 max-h-52 overflow-y-auto text-sm text-slate-700 whitespace-pre-line">
          {releaseNotes.length > 0
            ? releaseNotes
            : '暂无更新说明'}
        </div>
      </div>
    </Dialog>
  );
};

export default UpdateDialog;
