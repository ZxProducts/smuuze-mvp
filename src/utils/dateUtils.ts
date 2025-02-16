// 日付操作のユーティリティ関数
export function isWithinRange(date: string, range: { start: string | null; end: string | null }): boolean {
  const targetDate = new Date(date);
  
  if (range.start) {
    const startDate = new Date(range.start);
    if (targetDate < startDate) return false;
  }
  
  if (range.end) {
    const endDate = new Date(`${range.end}T23:59:59`);
    if (targetDate > endDate) return false;
  }
  
  return true;
}

export function getDefaultDateRange() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };
}

export function formatDate(date: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

// 日付の範囲内のデータをフィルタリング
export function filterTimeEntriesByDateRange<T extends { start_time: string }>(
  entries: T[],
  range: { start: string | null; end: string | null }
): T[] {
  if (!range.start && !range.end) return entries;
  return entries.filter(entry => isWithinRange(entry.start_time, range));
}

// 日付文字列を日本語の曜日付きでフォーマット
export function formatDateWithWeekday(date: string): string {
  return formatDate(date, {
    weekday: 'short',
  });
}

// 指定した日数前の日付を取得
export function getDateBefore(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// 日付文字列が有効かチェック
export function isValidDateString(date: string | null): boolean {
  if (!date) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}