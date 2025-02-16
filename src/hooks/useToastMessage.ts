import { useCallback } from 'react';

export function useToastMessage() {
  const showError = useCallback((message: string) => {
    alert(`エラー: ${message}`);
  }, []);

  const showSuccess = useCallback((message: string) => {
    alert(`成功: ${message}`);
  }, []);

  const showInfo = useCallback((message: string) => {
    alert(`お知らせ: ${message}`);
  }, []);

  return { showError, showSuccess, showInfo };
}