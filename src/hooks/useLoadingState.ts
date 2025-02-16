import { useState, useCallback } from 'react';
import { useToastMessage } from './useToastMessage';

interface LoadingOptions {
  showErrorMessage?: boolean;
  errorMessage?: string;
  showSuccessMessage?: boolean;
  successMessage?: string;
}

export function useLoadingState(initialState = false) {
  const [loading, setLoading] = useState(initialState);
  const { showError, showSuccess } = useToastMessage();

  const withLoading = useCallback(async <T>(
    callback: () => Promise<T>,
    options: LoadingOptions = {}
  ): Promise<T | undefined> => {
    const {
      showErrorMessage = true,
      errorMessage = 'エラーが発生しました',
      showSuccessMessage = false,
      successMessage = '処理が完了しました',
    } = options;

    try {
      setLoading(true);
      const result = await callback();
      if (showSuccessMessage) {
        showSuccess(successMessage);
      }
      return result;
    } catch (error) {
      console.error('Error in withLoading:', error);
      if (showErrorMessage) {
        showError(errorMessage);
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [showError, showSuccess]);

  return {
    loading,
    setLoading,
    withLoading,
  };
}

// 使用例:
/*
const { loading, withLoading } = useLoadingState();

// 基本的な使用方法
await withLoading(async () => {
  await someAsyncFunction();
});

// エラーメッセージをカスタマイズ
await withLoading(
  async () => {
    await someAsyncFunction();
  },
  {
    errorMessage: 'カスタムエラーメッセージ',
  }
);

// 成功メッセージを表示
await withLoading(
  async () => {
    await someAsyncFunction();
  },
  {
    showSuccessMessage: true,
    successMessage: 'カスタム成功メッセージ',
  }
);

// メッセージを非表示
await withLoading(
  async () => {
    await someAsyncFunction();
  },
  {
    showErrorMessage: false,
    showSuccessMessage: false,
  }
);
*/