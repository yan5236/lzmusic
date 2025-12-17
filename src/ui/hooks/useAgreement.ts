import { useCallback, useState } from 'react';

export function useAgreement() {
  // 将用户协议同意状态持久化，避免重复弹窗
  const [showAgreement, setShowAgreement] = useState(() => {
    const agreed = localStorage.getItem('agreementAccepted');
    return agreed !== 'true';
  });

  const handleAgreementAccept = useCallback(() => {
    localStorage.setItem('agreementAccepted', 'true');
    setShowAgreement(false);
  }, []);

  const handleExitApp = useCallback(() => {
    window.close();
  }, []);

  return { showAgreement, handleAgreementAccept, handleExitApp };
}
