import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Minus, Square, X } from 'lucide-react';
import appIcon from '../../../assets/icon.ico';
import restoreDownIcon from '../assets/restore-down.svg';
import { CloseConfirmDialog, type CloseActionOption } from './CloseConfirmDialog';
import { getCloseBehaviorPreference, setCloseBehaviorPreference } from '../utils/closeBehavior';

type WindowControlAction = 'minimize' | 'toggle-maximize' | 'close' | 'get-state' | 'hide-to-tray' | 'quit-app';
type WindowControlResponse = { success: boolean; isMaximized: boolean };
type WindowControlResult = WindowControlResponse | undefined;

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeOption, setCloseOption] = useState<CloseActionOption>(() => {
    const preference = getCloseBehaviorPreference();
    return preference === 'exit' ? 'exit' : 'minimize';
  });
  const [rememberCloseChoice, setRememberCloseChoice] = useState(false);

  const updateWindowState = useCallback(async (action: WindowControlAction) => {
    try {
      const result = await window.electron.invoke('window-control', action) as WindowControlResult;
      if (result && typeof result.isMaximized === 'boolean') {
        setIsMaximized(result.isMaximized);
      }
    } catch (error) {
      console.error('窗口控制失败:', error);
    }
  }, []);

  useEffect(() => {
    updateWindowState('get-state');
  }, [updateWindowState]);

  const handleMinimize = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    updateWindowState('minimize');
  };

  const handleToggleMaximize = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    updateWindowState('toggle-maximize');
  };

  const performCloseBehavior = useCallback(
    (action: CloseActionOption) => {
      if (action === 'exit') {
        updateWindowState('quit-app');
      } else {
        updateWindowState('hide-to-tray');
      }
    },
    [updateWindowState]
  );

  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    const preference = getCloseBehaviorPreference();
    if (preference === 'ask') {
      setCloseOption('minimize');
      setRememberCloseChoice(false);
      setShowCloseDialog(true);
      return;
    }

    const targetAction: CloseActionOption = preference === 'exit' ? 'exit' : 'minimize';
    performCloseBehavior(targetAction);
  };

  const handleConfirmClose = () => {
    if (rememberCloseChoice) {
      setCloseBehaviorPreference(closeOption);
    }
    setShowCloseDialog(false);
    performCloseBehavior(closeOption);
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 h-12 bg-white text-slate-800 shadow-md z-[70] app-drag border-b border-slate-200"
        onDoubleClick={() => handleToggleMaximize()}
      >
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={appIcon} alt="App Icon" className="w-8 h-8 rounded-md shadow-sm border border-slate-200 app-no-drag" draggable={false} />
            <p className="text-sm font-semibold tracking-wide">LZMusic</p>
          </div>

          <div className="flex items-center gap-3 app-no-drag">
            <div className="flex items-center rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
              <button
                type="button"
                onClick={handleMinimize}
                className="w-12 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                title="最小化"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={handleToggleMaximize}
                className="w-12 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                title={isMaximized ? '还原窗口' : '最大化'}
              >
                {isMaximized ? (
                  <img src={restoreDownIcon} alt="Restore" className="w-3.5 h-3.5" draggable={false} />
                ) : (
                  <Square size={14} />
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-12 h-8 flex items-center justify-center text-slate-600 hover:bg-red-500 hover:text-white transition-colors"
                title="关闭"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <CloseConfirmDialog
        open={showCloseDialog}
        selectedOption={closeOption}
        rememberChoice={rememberCloseChoice}
        onSelectOption={setCloseOption}
        onRememberChange={setRememberCloseChoice}
        onConfirm={handleConfirmClose}
        onCancel={() => setShowCloseDialog(false)}
      />
    </>
  );
}
