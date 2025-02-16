import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export function useQueryParams() {
  const searchParams = useSearchParams();

  const getParam = useCallback((key: string): string | null => {
    return searchParams?.get(key) ?? null;
  }, [searchParams]);

  const hasParam = useCallback((key: string): boolean => {
    return searchParams?.has(key) ?? false;
  }, [searchParams]);

  const getAllParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {};
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    return params;
  }, [searchParams]);

  const getParamAsNumber = useCallback((key: string): number | null => {
    const value = getParam(key);
    if (value === null) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }, [getParam]);

  const getParamAsBoolean = useCallback((key: string): boolean | null => {
    const value = getParam(key);
    if (value === null) return null;
    return value.toLowerCase() === 'true';
  }, [getParam]);

  return {
    getParam,
    hasParam,
    getAllParams,
    getParamAsNumber,
    getParamAsBoolean,
  };
}

// 使用例:
/*
const { getParam, getParamAsNumber, hasParam } = useQueryParams();

// URLが /?page=2&search=test の場合
const page = getParamAsNumber('page'); // 2
const search = getParam('search'); // "test"
const hasFilter = hasParam('filter'); // false
*/