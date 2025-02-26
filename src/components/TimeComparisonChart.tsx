'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Select,
  HStack,
  Text,
  ButtonGroup,
  Button,
  useColorModeValue,
  Flex,
  Spacer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from '@chakra-ui/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TimeEntryWithDetails } from '@/types/database.types';
import { ChartStyles } from './ChartStyleSettings';
import { DateRange } from './ChartDateFilter';
import { filterTimeEntriesByDateRange } from '@/utils/dateUtils';
import { Profile } from '@/types/database.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TimeEntryWithUser extends TimeEntryWithDetails {}

interface TaskWithTimeEntries {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
  team_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignees: Profile[];
  time_entries: TimeEntryWithUser[];
}

type ComparisonType = 'periods' | 'members' | 'tasks';
type GroupBy = 'daily' | 'weekly' | 'monthly';

interface TimeComparisonChartProps {
  tasks: TaskWithTimeEntries[];
  chartStyles: ChartStyles;
  dateRange: DateRange;
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function TimeComparisonChart({ tasks, chartStyles, dateRange }: TimeComparisonChartProps) {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('periods');
  const [groupBy, setGroupBy] = useState<GroupBy>('daily');
  const textColor = useColorModeValue('gray.600', 'gray.200');
  const colors = chartStyles.colorScheme;

  const comparisonData = useMemo(() => {
    if (comparisonType === 'periods') {
      // 期間比較のデータ集計
      const currentData = new Map<string, number>();
      const previousData = new Map<string, number>();

      const currentEntries = tasks.flatMap(task => 
        filterTimeEntriesByDateRange(task.time_entries, dateRange)
      );

      const previousStart = new Date(dateRange.start!);
      const previousEnd = new Date(dateRange.end!);
      const daysDiff = (previousEnd.getTime() - previousStart.getTime()) / (1000 * 60 * 60 * 24);
      previousStart.setDate(previousStart.getDate() - daysDiff);
      previousEnd.setDate(previousEnd.getDate() - daysDiff);

      const previousDateRange = {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0],
      };

      const previousEntries = tasks.flatMap(task =>
        filterTimeEntriesByDateRange(task.time_entries, previousDateRange)
      );

      currentEntries.forEach(entry => {
        const date = new Date(entry.start_time);
        let key: string;
        
        switch (groupBy) {
          case 'weekly':
            key = `W${getWeekNumber(date)}`;
            break;
          case 'monthly':
            key = getMonthKey(date);
            break;
          default:
            key = entry.start_time.split('T')[0];
        }

        const minutes = entry.end_time
          ? (new Date(entry.end_time).getTime() - date.getTime()) / (1000 * 60)
          : 0;

        currentData.set(key, (currentData.get(key) || 0) + minutes);
      });

      previousEntries.forEach(entry => {
        const date = new Date(entry.start_time);
        let key: string;
        
        switch (groupBy) {
          case 'weekly':
            key = `W${getWeekNumber(date)}`;
            break;
          case 'monthly':
            key = getMonthKey(date);
            break;
          default:
            key = entry.start_time.split('T')[0];
        }

        const minutes = entry.end_time
          ? (new Date(entry.end_time).getTime() - date.getTime()) / (1000 * 60)
          : 0;

        previousData.set(key, (previousData.get(key) || 0) + minutes);
      });

      // キーの配列を作成して並び替え
      const currentKeys = Array.from(currentData.keys());
      const previousKeys = Array.from(previousData.keys());
      const allKeys = currentKeys
        .concat(previousKeys.filter(key => !currentKeys.includes(key)))
        .sort();

      return {
        labels: allKeys,
        datasets: [
          {
            label: '今期間',
            data: allKeys.map(key => {
              const minutes = currentData.get(key) || 0;
              return Math.round(minutes / 60 * 10) / 10;
            }),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          },
          {
            label: '前期間',
            data: allKeys.map(key => {
              const minutes = previousData.get(key) || 0;
              return Math.round(minutes / 60 * 10) / 10;
            }),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
          },
        ],
        summary: {
          current: {
            total: currentKeys.reduce((sum, key) => sum + (currentData.get(key) || 0), 0) / 60,
            average: currentKeys.length > 0
              ? currentKeys.reduce((sum, key) => sum + (currentData.get(key) || 0), 0) / (60 * currentKeys.length)
              : 0,
          },
          previous: {
            total: previousKeys.reduce((sum, key) => sum + (previousData.get(key) || 0), 0) / 60,
            average: previousKeys.length > 0
              ? previousKeys.reduce((sum, key) => sum + (previousData.get(key) || 0), 0) / (60 * previousKeys.length)
              : 0,
          },
        },
      };
    } else if (comparisonType === 'members') {
      // メンバー比較のデータ集計
      const memberData = new Map<string, { current: number; previous: number; name: string }>();

      tasks.forEach(task => {
        task.time_entries.forEach(entry => {
          const isCurrentPeriod = filterTimeEntriesByDateRange([entry], dateRange).length > 0;
          const minutes = entry.end_time
            ? (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60)
            : 0;

          const memberStats = memberData.get(entry.user.id) || {
            current: 0,
            previous: 0,
            name: entry.user.full_name,
          };

          if (isCurrentPeriod) {
            memberStats.current += minutes;
          } else {
            memberStats.previous += minutes;
          }

          memberData.set(entry.user.id, memberStats);
        });
      });

      const members = Array.from(memberData.values());
      return {
        labels: members.map(m => m.name),
        datasets: [
          {
            label: '今期間',
            data: members.map(m => Math.round(m.current / 60 * 10) / 10),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          },
          {
            label: '前期間',
            data: members.map(m => Math.round(m.previous / 60 * 10) / 10),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
          },
        ],
        summary: {
          current: {
            total: members.reduce((sum, m) => sum + m.current / 60, 0),
            average: members.reduce((sum, m) => sum + m.current / 60, 0) / members.length,
          },
          previous: {
            total: members.reduce((sum, m) => sum + m.previous / 60, 0),
            average: members.reduce((sum, m) => sum + m.previous / 60, 0) / members.length,
          },
        },
      };
    } else {
      // タスク比較のデータ集計
      const taskData = new Map<string, { current: number; previous: number; title: string }>();

      tasks.forEach(task => {
        const stats = { current: 0, previous: 0, title: task.title };

        task.time_entries.forEach(entry => {
          const isCurrentPeriod = filterTimeEntriesByDateRange([entry], dateRange).length > 0;
          const minutes = entry.end_time
            ? (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60)
            : 0;

          if (isCurrentPeriod) {
            stats.current += minutes;
          } else {
            stats.previous += minutes;
          }
        });

        taskData.set(task.id, stats);
      });

      const taskStats = Array.from(taskData.values());
      return {
        labels: taskStats.map(t => t.title),
        datasets: [
          {
            label: '今期間',
            data: taskStats.map(t => Math.round(t.current / 60 * 10) / 10),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          },
          {
            label: '前期間',
            data: taskStats.map(t => Math.round(t.previous / 60 * 10) / 10),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
          },
        ],
        summary: {
          current: {
            total: taskStats.reduce((sum, t) => sum + t.current / 60, 0),
            average: taskStats.reduce((sum, t) => sum + t.current / 60, 0) / taskStats.length,
          },
          previous: {
            total: taskStats.reduce((sum, t) => sum + t.previous / 60, 0),
            average: taskStats.reduce((sum, t) => sum + t.previous / 60, 0) / taskStats.length,
          },
        },
      };
    }
  }, [tasks, dateRange, comparisonType, groupBy]);

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        display: chartStyles.showLegend,
        position: 'top' as const,
        labels: {
          color: textColor,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y}時間`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: chartStyles.barStyle === 'stacked',
        ticks: {
          color: textColor,
        },
      },
      y: {
        stacked: chartStyles.barStyle === 'stacked',
        beginAtZero: true,
        ticks: {
          color: textColor,
          callback: (value) => `${value}h`,
        },
      },
    },
    animation: {
      duration: chartStyles.animations ? 750 : 0,
    },
  };

  const renderSummary = () => {
    const { current, previous } = comparisonData.summary;
    const totalDiff = ((current.total - previous.total) / previous.total * 100).toFixed(1);
    const avgDiff = ((current.average - previous.average) / previous.average * 100).toFixed(1);

    return (
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th></Th>
            <Th>今期間</Th>
            <Th>前期間</Th>
            <Th>変化</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>合計時間</Td>
            <Td>{current.total.toFixed(1)}h</Td>
            <Td>{previous.total.toFixed(1)}h</Td>
            <Td>
              <Badge
                colorScheme={Number(totalDiff) > 0 ? 'green' : Number(totalDiff) < 0 ? 'red' : 'gray'}
              >
                {totalDiff}%
              </Badge>
            </Td>
          </Tr>
          <Tr>
            <Td>平均時間</Td>
            <Td>{current.average.toFixed(1)}h</Td>
            <Td>{previous.average.toFixed(1)}h</Td>
            <Td>
              <Badge
                colorScheme={Number(avgDiff) > 0 ? 'green' : Number(avgDiff) < 0 ? 'red' : 'gray'}
              >
                {avgDiff}%
              </Badge>
            </Td>
          </Tr>
        </Tbody>
      </Table>
    );
  };

  return (
    <Box>
      <Flex mb={4} align="center">
        <Box>
          <Heading size="md">作業時間の比較分析</Heading>
          <Text color="gray.500" fontSize="sm">
            期間、メンバー、タスク別の作業時間を比較
          </Text>
        </Box>
        <Spacer />
        <HStack spacing={2}>
          <Select
            size="sm"
            value={comparisonType}
            onChange={(e) => setComparisonType(e.target.value as ComparisonType)}
            w="150px"
          >
            <option value="periods">期間比較</option>
            <option value="members">メンバー比較</option>
            <option value="tasks">タスク比較</option>
          </Select>
          {comparisonType === 'periods' && (
            <Select
              size="sm"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              w="120px"
            >
              <option value="daily">日次</option>
              <option value="weekly">週次</option>
              <option value="monthly">月次</option>
            </Select>
          )}
        </HStack>
      </Flex>

      <VStack spacing={6} align="stretch">
        <Box
          borderWidth={1}
          borderRadius="lg"
          p={4}
        >
          <Bar data={comparisonData} options={chartOptions} />
        </Box>

        <Box
          borderWidth={1}
          borderRadius="lg"
          p={4}
        >
          {renderSummary()}
        </Box>
      </VStack>
    </Box>
  );
}