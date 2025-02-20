'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Spacer,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  LineElement,
  PointElement,
  Scale,
  CoreScaleOptions,
  TooltipModel,
  TooltipItem,
  ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { TimeEntryRow } from '@/lib/supabase';
import 'chartjs-adapter-date-fns';
import { ja } from 'date-fns/locale';
import { ChartDateFilter, PresetRange, DateRange } from './ChartDateFilter';
import { ChartExportButton } from './ChartExportButton';
import {
  getDefaultDateRange,
  filterTimeEntriesByDateRange,
  isWithinRange,
} from '@/utils/dateUtils';
import {
  ChartStyleSettings,
  ChartStyles,
  defaultChartStyles,
  getChartColors,
} from './ChartStyleSettings';
import { TimeComparisonChart } from './TimeComparisonChart';
import { Profile, Task } from '@/types/database.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  LineElement,
  PointElement
);

interface TimeEntryWithUser extends TimeEntryRow {
  user: {
    id: string;
    full_name: string;
  };
}

interface TaskWithTimeEntries extends Task {
  time_entries: TimeEntryWithUser[];
  assignees: Profile[];
}

interface ProjectChartsProps {
  tasks: TaskWithTimeEntries[];
}

interface ChartOptionsWithPlugins {
  doughnut: ChartOptions<'doughnut'>;
  line: ChartOptions<'line'>;
  bar: ChartOptions<'bar'>;
}

export function ProjectCharts({ tasks }: ProjectChartsProps) {
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.200');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [preset, setPreset] = useState<PresetRange>('30days');
  const [chartStyles, setChartStyles] = useState<ChartStyles>(defaultChartStyles);
  const [activeTab, setActiveTab] = useState(0);

  // メンバー別作業時間の集計
  const memberTimeData = useMemo(() => {
    const memberStats = new Map<string, {
      name: string;
      totalMinutes: number;
      color: string;
    }>();

    const colors = [
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 206, 86)',
      'rgb(75, 192, 192)',
      'rgb(153, 102, 255)',
    ];

    tasks.forEach(task => {
      const filteredEntries = filterTimeEntriesByDateRange(task.time_entries, dateRange);
      filteredEntries.forEach(entry => {
        const minutes = entry.end_time
          ? (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60)
          : (new Date().getTime() - new Date(entry.start_time).getTime()) / (1000 * 60);

        const existing = memberStats.get(entry.user.id);
        if (existing) {
          existing.totalMinutes += minutes;
        } else {
          memberStats.set(entry.user.id, {
            name: entry.user.full_name,
            totalMinutes: minutes,
            color: colors[memberStats.size % colors.length],
          });
        }
      });
    });

    return Array.from(memberStats.values());
  }, [tasks, dateRange]);

  // 日別作業時間の集計
  const dailyTimeData = useMemo(() => {
    const dailyStats = new Map<string, number>();

    tasks.forEach(task => {
      const filteredEntries = filterTimeEntriesByDateRange(task.time_entries, dateRange);
      filteredEntries.forEach(entry => {
        const startDate = new Date(entry.start_time);
        const dateKey = startDate.toISOString().split('T')[0];
        const minutes = entry.end_time
          ? (new Date(entry.end_time).getTime() - startDate.getTime()) / (1000 * 60)
          : (new Date().getTime() - startDate.getTime()) / (1000 * 60);

        dailyStats.set(
          dateKey,
          (dailyStats.get(dateKey) || 0) + minutes
        );
      });
    });

    // 日付でソート
    return Array.from(dailyStats.entries())
      .sort(([a], [b]) => a.localeCompare(b));
  }, [tasks, dateRange]);

  // グラフのオプション設定
  const chartOptions: ChartOptionsWithPlugins = useMemo(() => ({
    doughnut: {
      responsive: true,
      animation: {
        duration: chartStyles.animations ? 750 : 0,
      },
      plugins: {
        legend: {
          display: chartStyles.showLegend,
          position: 'bottom' as const,
          labels: {
            color: textColor,
          },
        },
        tooltip: {
          callbacks: {
            label: function(this: TooltipModel<'doughnut'>, tooltipItem: TooltipItem<'doughnut'>) {
              const hours = Math.round(Number(tooltipItem.raw) * 10) / 10;
              return `${tooltipItem.label}: ${hours}時間`;
            },
          },
        },
      },
    },
    line: {
      responsive: true,
      animation: {
        duration: chartStyles.animations ? 750 : 0,
      },
      elements: {
        line: {
          tension: chartStyles.lineStyle === 'curved' ? 0.4 : 0,
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day' as const,
            tooltipFormat: 'yyyy/MM/dd',
            displayFormats: {
              day: 'M/d',
            },
          },
          adapters: {
            date: {
              locale: ja,
            },
          },
          ticks: {
            color: textColor,
          },
        },
        y: {
          beginAtZero: true,
          stacked: chartStyles.barStyle === 'stacked',
          ticks: {
            color: textColor,
            callback: function(this: Scale<CoreScaleOptions>, value: string | number) {
              if (typeof value === 'number') {
                return `${value}h`;
              }
              return value;
            },
          },
        },
      },
      plugins: {
        legend: {
          display: chartStyles.showLegend,
          labels: {
            color: textColor,
          },
        },
        tooltip: {
          callbacks: {
            label: function(this: TooltipModel<'line'>, tooltipItem: TooltipItem<'line'>) {
              const hours = Math.round(Number(tooltipItem.raw) * 10) / 10;
              return `作業時間: ${hours}時間`;
            },
          },
        },
      },
    },
    bar: {
      responsive: true,
      animation: {
        duration: chartStyles.animations ? 750 : 0,
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
            stepSize: 1,
            color: textColor,
          },
        },
      },
      plugins: {
        legend: {
          display: chartStyles.showLegend,
          labels: {
            color: textColor,
          },
        },
      },
    },
  }), [textColor, chartStyles]);

  const colors = useMemo(() => getChartColors(chartStyles.colorScheme), [chartStyles.colorScheme]);

  return (
    <VStack spacing={6} align="stretch">
      <Box borderWidth={1} borderRadius="lg" borderColor={borderColor} p={4}>
        <VStack spacing={4} align="stretch">
          <HStack>
            <Heading size="md">作業時間の分析</Heading>
            <Spacer />
            <ChartStyleSettings
              styles={chartStyles}
              onChange={setChartStyles}
            />
            <ChartExportButton
              tasks={tasks}
              dateRange={dateRange}
            />
          </HStack>
          <ChartDateFilter
            range={dateRange}
            preset={preset}
            onRangeChange={setDateRange}
            onPresetChange={setPreset}
          />
        </VStack>
      </Box>

      <Tabs index={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab>概要</Tab>
          <Tab>比較分析</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
              {/* メンバー別作業時間 */}
              <Box p={4} borderWidth={1} borderRadius="lg" borderColor={borderColor}>
                <Heading size="md" mb={4}>メンバー別作業時間</Heading>
                <Doughnut
                  data={{
                    labels: memberTimeData.map(d => d.name),
                    datasets: [{
                      data: memberTimeData.map(d => Math.round(d.totalMinutes / 60 * 10) / 10),
                      backgroundColor: colors,
                    }],
                  }}
                  options={chartOptions.doughnut}
                />
              </Box>

              {/* 日別作業時間推移 */}
              <Box p={4} borderWidth={1} borderRadius="lg" borderColor={borderColor}>
                <Heading size="md" mb={4}>日別作業時間推移</Heading>
                <Line
                  data={{
                    labels: dailyTimeData.map(([date]) => date),
                    datasets: [{
                      label: '作業時間',
                      data: dailyTimeData.map(([_, minutes]) => Math.round(minutes / 60 * 10) / 10),
                      borderColor: colors[0],
                      backgroundColor: colors[0],
                      tension: chartStyles.lineStyle === 'curved' ? 0.4 : 0,
                    }],
                  }}
                  options={chartOptions.line}
                />
              </Box>

              {/* データ概要 */}
              <Box p={4} borderWidth={1} borderRadius="lg" borderColor={borderColor}>
                <Heading size="md" mb={4}>データ概要</Heading>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text>総作業時間</Text>
                    <Text fontWeight="bold">
                      {Math.round(memberTimeData.reduce((sum, d) => sum + d.totalMinutes, 0) / 60 * 10) / 10}時間
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>作業メンバー数</Text>
                    <Text fontWeight="bold">{memberTimeData.length}人</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>作業日数</Text>
                    <Text fontWeight="bold">{dailyTimeData.length}日</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>1日平均作業時間</Text>
                    <Text fontWeight="bold">
                      {dailyTimeData.length > 0
                        ? Math.round(dailyTimeData.reduce((sum, [_, h]) => sum + h, 0) / dailyTimeData.length / 60 * 10) / 10
                        : 0}時間
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </SimpleGrid>
          </TabPanel>

          <TabPanel px={0}>
            <TimeComparisonChart
              tasks={tasks}
              chartStyles={chartStyles}
              dateRange={dateRange}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}