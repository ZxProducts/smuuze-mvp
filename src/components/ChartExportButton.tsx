'use client';

import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Text,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { ChevronDownIcon, DownloadIcon } from '@chakra-ui/icons';
import { TaskRow, TimeEntryRow } from '@/lib/supabase/supabase';
import { DateRange } from './ChartDateFilter';
import { filterTimeEntriesByDateRange } from '@/utils/dateUtils';

interface TimeEntryWithUser extends TimeEntryRow {
  user: {
    id: string;
    full_name: string;
  };
}

interface TaskWithTimeEntries extends TaskRow {
  time_entries: TimeEntryWithUser[];
}

interface ChartExportButtonProps {
  tasks: TaskWithTimeEntries[];
  dateRange: DateRange;
  isDisabled?: boolean;
}

type ExportFormat = 'csv' | 'excel';

interface ChartData {
  memberTimeData: {
    name: string;
    hours: number;
    taskCount: number;
  }[];
  dailyTimeData: {
    date: string;
    hours: number;
  }[];
  statusData: {
    status: string;
    count: number;
  }[];
}

function prepareExportData(tasks: TaskWithTimeEntries[], dateRange: DateRange): ChartData {
  // メンバー別作業時間の集計
  const memberStats = new Map<string, { name: string; minutes: number; tasks: Set<string> }>();
  
  tasks.forEach(task => {
    const filteredEntries = filterTimeEntriesByDateRange(task.time_entries, dateRange);
    filteredEntries.forEach(entry => {
      const minutes = entry.end_time
        ? (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60)
        : (new Date().getTime() - new Date(entry.start_time).getTime()) / (1000 * 60);

      const stats = memberStats.get(entry.user.id) || {
        name: entry.user.full_name,
        minutes: 0,
        tasks: new Set<string>(),
      };
      stats.minutes += minutes;
      stats.tasks.add(task.id);
      memberStats.set(entry.user.id, stats);
    });
  });

  // 日別作業時間の集計
  const dailyStats = new Map<string, number>();
  tasks.forEach(task => {
    const filteredEntries = filterTimeEntriesByDateRange(task.time_entries, dateRange);
    filteredEntries.forEach(entry => {
      const dateKey = new Date(entry.start_time).toISOString().split('T')[0];
      const minutes = entry.end_time
        ? (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60)
        : (new Date().getTime() - new Date(entry.start_time).getTime()) / (1000 * 60);
      dailyStats.set(dateKey, (dailyStats.get(dateKey) || 0) + minutes);
    });
  });

  // ステータス別の集計
  const statusCounts = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
  };

  tasks.forEach(task => {
    const hasWorkInRange = task.time_entries.some(entry =>
      filterTimeEntriesByDateRange([entry], dateRange).length > 0
    );
    if (hasWorkInRange) {
      statusCounts[task.status]++;
    }
  });

  return {
    memberTimeData: Array.from(memberStats.values()).map(stats => ({
      name: stats.name,
      hours: Math.round(stats.minutes / 60 * 10) / 10,
      taskCount: stats.tasks.size,
    })),
    dailyTimeData: Array.from(dailyStats.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, minutes]) => ({
        date,
        hours: Math.round(minutes / 60 * 10) / 10,
      })),
    statusData: [
      { status: '未着手', count: statusCounts.not_started },
      { status: '進行中', count: statusCounts.in_progress },
      { status: '完了', count: statusCounts.completed },
    ],
  };
}

function generateCSV(data: ChartData): string {
  const lines: string[][] = [];

  // メンバー別作業時間
  lines.push(['メンバー別作業時間']);
  lines.push(['メンバー名', '作業時間（時間）', '作業タスク数']);
  data.memberTimeData.forEach(member => {
    lines.push([member.name, member.hours.toString(), member.taskCount.toString()]);
  });
  lines.push([]);

  // 日別作業時間
  lines.push(['日別作業時間']);
  lines.push(['日付', '作業時間（時間）']);
  data.dailyTimeData.forEach(daily => {
    lines.push([daily.date, daily.hours.toString()]);
  });
  lines.push([]);

  // ステータス分布
  lines.push(['タスクステータス分布']);
  lines.push(['ステータス', 'タスク数']);
  data.statusData.forEach(status => {
    lines.push([status.status, status.count.toString()]);
  });

  return lines
    .map(line => line.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
    .join('\n');
}

export function ChartExportButton({
  tasks,
  dateRange,
  isDisabled = false,
}: ChartExportButtonProps) {
  const toast = useToast();

  const handleExport = async (format: ExportFormat) => {
    try {
      const data = prepareExportData(tasks, dateRange);
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'csv') {
        content = generateCSV(data);
        mimeType = 'text/csv;charset=utf-8';
        extension = 'csv';
      } else {
        // Excelの場合は文字化け防止のためBOMを追加
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        content = generateCSV(data);
        mimeType = 'application/vnd.ms-excel;charset=utf-8';
        extension = 'xls';
        const blob = new Blob([bom, content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chart_data_${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart_data_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'エクスポート完了',
        description: 'データのダウンロードを開始しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'エクスポートエラー',
        description: 'データのエクスポートに失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<ChevronDownIcon />}
        leftIcon={<DownloadIcon />}
        isDisabled={isDisabled}
        variant="outline"
        size="sm"
      >
        エクスポート
      </MenuButton>
      <MenuList>
        <MenuItem onClick={() => handleExport('csv')}>
          <HStack>
            <DownloadIcon />
            <Text>CSV形式</Text>
          </HStack>
        </MenuItem>
        <MenuItem onClick={() => handleExport('excel')}>
          <HStack>
            <DownloadIcon />
            <Text>Excel形式</Text>
          </HStack>
        </MenuItem>
      </MenuList>
    </Menu>
  );
}