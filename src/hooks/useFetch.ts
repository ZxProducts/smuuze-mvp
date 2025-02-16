import { useState } from 'react';
import { useLoadingState } from './useLoadingState';
import { useToastMessage } from './useToastMessage';

export function useFetch() {
  const [error, setError] = useState<Error | null>(null);
  const { loading, withLoading } = useLoadingState();
  const { showError, showSuccess } = useToastMessage();

  const fetchData = async <T>(
    fetchFn: () => Promise<T>,
    options: {
      errorMessage?: string;
      successMessage?: string;
      showSuccessMessage?: boolean;
    } = {}
  ): Promise<T | null> => {
    const {
      errorMessage = 'データの取得に失敗しました',
      successMessage = 'データを取得しました',
      showSuccessMessage = false,
    } = options;

    try {
      const result = await withLoading(
        async () => {
          const data = await fetchFn();
          if (showSuccessMessage) {
            showSuccess(successMessage);
          }
          return data;
        },
        {
          errorMessage,
          showSuccessMessage: false,
        }
      );

      setError(null);
      return result || null;
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Unknown error occurred');
      setError(err);
      return null;
    }
  };

  const mutateData = async <T>(
    mutateFn: () => Promise<T>,
    options: {
      errorMessage?: string;
      successMessage?: string;
      showSuccessMessage?: boolean;
    } = {}
  ): Promise<T | null> => {
    const {
      errorMessage = '操作に失敗しました',
      successMessage = '操作が完了しました',
      showSuccessMessage = true,
    } = options;

    try {
      const result = await withLoading(
        async () => {
          const data = await mutateFn();
          if (showSuccessMessage) {
            showSuccess(successMessage);
          }
          return data;
        },
        {
          errorMessage,
          showSuccessMessage: false,
        }
      );

      setError(null);
      return result || null;
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Unknown error occurred');
      setError(err);
      return null;
    }
  };

  return {
    loading,
    error,
    fetchData,
    mutateData,
  };
}