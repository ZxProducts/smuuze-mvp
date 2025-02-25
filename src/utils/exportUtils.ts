import { TaskRow, TimeEntryRow } from '@/lib/supabase/supabase';

interface TimeEntryWithUser extends TimeEntryRow {
  user: {
    id: string;
    full_name: string;
  };
}

interface TaskWithTimeEntries extends TaskRow {
  time_entries: TimeEntryWithUser[];
}

// CSVデータの生成
function generateCSV(rows: string[][]): string {
  return rows
    .map(row => 
      row.map(cell => {
        // カンマやダブルクォートを含む場合は、ダブルクォートで囲む
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
    .join('\n');
}

// 日時のフォーマット
function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ミリ秒を時間と分に変換
function formatDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
}

// タスク一覧のエクスポート
export function exportTasks(tasks: TaskRow[]): string {
  const headers = ['タスクID', 'タイトル', '説明', '優先度', 'ステータス', '担当者', '期限'];
  const rows = tasks.map(task => [
    task.id,
    task.title,
    task.description || '',
    task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低',
    task.status === 'completed' ? '完了' : task.status === 'in_progress' ? '進行中' : '未着手',
    task.assigned_to || '',
    task.due_date ? new Date(task.due_date).toLocaleDateString('ja-JP') : ''
  ]);

  return generateCSV([headers, ...rows]);
}

// 作業時間データのエクスポート
export function exportTimeEntries(tasks: TaskWithTimeEntries[]): string {
  const headers = ['タスク名', '作業者', '開始時刻', '終了時刻', '作業時間', '説明'];
  const rows = tasks.flatMap(task =>
    task.time_entries.map(entry => {
      const duration = entry.end_time
        ? new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()
        : new Date().getTime() - new Date(entry.start_time).getTime();

      return [
        task.title,
        entry.user.full_name,
        formatDateTime(entry.start_time),
        entry.end_time ? formatDateTime(entry.end_time) : '作業中',
        formatDuration(duration),
        entry.description || ''
      ];
    })
  );

  return generateCSV([headers, ...rows]);
}

// メンバー別集計データのエクスポート
export function exportMemberSummary(tasks: TaskWithTimeEntries[]): string {
  const headers = ['メンバー名', '総作業時間', '完了タスク数', '作業中タスク数'];
  const memberStats = new Map<string, {
    name: string;
    totalTime: number;
    completedTasks: Set<string>;
    inProgressTasks: Set<string>;
  }>();

  tasks.forEach(task => {
    task.time_entries.forEach(entry => {
      const stats = memberStats.get(entry.user.id) || {
        name: entry.user.full_name,
        totalTime: 0,
        completedTasks: new Set<string>(),
        inProgressTasks: new Set<string>(),
      };

      const duration = entry.end_time
        ? new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()
        : new Date().getTime() - new Date(entry.start_time).getTime();

      stats.totalTime += duration;

      if (task.status === 'completed') {
        stats.completedTasks.add(task.id);
      } else if (task.status === 'in_progress') {
        stats.inProgressTasks.add(task.id);
      }

      memberStats.set(entry.user.id, stats);
    });
  });

  const rows = Array.from(memberStats.values()).map(stats => [
    stats.name,
    formatDuration(stats.totalTime),
    stats.completedTasks.size.toString(),
    stats.inProgressTasks.size.toString()
  ]);

  return generateCSV([headers, ...rows]);
}

// ダウンロード用のBlob URLを生成
export function createDownloadUrl(content: string, type: string): string {
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // BOMを追加してExcelで文字化けを防ぐ
  const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8' });
  return URL.createObjectURL(blob);
}

// エクスポートタイプの定義
export type ExportType = 'tasks' | 'timeEntries' | 'memberSummary';

// ファイル名の生成
export function generateFileName(type: ExportType, projectName: string): string {
  const date = new Date().toISOString().split('T')[0];
  const typeNames = {
    tasks: 'タスク一覧',
    timeEntries: '作業時間',
    memberSummary: 'メンバー集計'
  };
  return `${projectName}_${typeNames[type]}_${date}.csv`;
}