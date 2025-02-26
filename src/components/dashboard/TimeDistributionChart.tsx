'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Box, Text } from '@chakra-ui/react';
import { TimeStats } from '@/types/api';

// ChartJSの設定を登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TimeDistributionChartProps {
  monthlyDistribution: TimeStats['monthlyDistribution'];
}

export default function TimeDistributionChart({ monthlyDistribution }: TimeDistributionChartProps) {
  console.log('TimeDistributionChart props:', {
    monthlyDistribution,
    isArray: Array.isArray(monthlyDistribution),
    length: monthlyDistribution?.length,
  });

  // 月の名前を取得する関数
  const getMonthName = (month: number) => {
    return new Date(2024, month - 1).toLocaleDateString('ja-JP', { month: 'long' });
  };

  // プロジェクトの一意のリストを取得
  const projectIds = new Set<string>();
  if (monthlyDistribution && monthlyDistribution.length > 0) {
    monthlyDistribution.forEach(month => {
      month.byProject.forEach(project => {
        projectIds.add(project.project_id);
      });
    });
  }

  // データの最大値を計算（分単位）
  const calculateMaxValue = () => {
    if (!monthlyDistribution || monthlyDistribution.length === 0) {
      return 60; // データがない場合は1時間をデフォルト値とする
    }
    let maxValue = 0;
    monthlyDistribution.forEach(month => {
      let monthTotal = 0;
      month.byProject.forEach(project => {
        const [hours, minutes, seconds] = project.time.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + (seconds / 60);
        monthTotal += totalMinutes;
      });
      maxValue = Math.max(maxValue, monthTotal);
    });
    // 最大値に20%のマージンを追加
    return Math.ceil(maxValue * 1.2);
  };

  // カラーパレットの定義
  const colors = [
    'rgba(75, 192, 192, 0.7)',  // 緑
    'rgba(153, 102, 255, 0.7)', // 紫
    'rgba(255, 159, 64, 0.7)',  // オレンジ
    'rgba(255, 205, 86, 0.7)',  // 黄
    'rgba(255, 99, 132, 0.7)',  // 赤
  ];

  // チャートデータの作成
  const data: ChartData<'bar'> = {
    labels: monthlyDistribution && monthlyDistribution.length > 0
      ? monthlyDistribution.map(m => getMonthName(m.month))
      : [getMonthName(new Date().getMonth() + 1)],
    datasets: projectIds.size > 0
      ? Array.from(projectIds).map((projectId, index) => ({
          label: monthlyDistribution[0]?.byProject.find(p => p.project_id === projectId)?.project_name || 'Unknown',
          data: monthlyDistribution.map(month => {
            const project = month.byProject.find(p => p.project_id === projectId);
            if (!project) return 0;
            const [hours, minutes, seconds] = project.time.split(':').map(Number);
            return hours * 60 + minutes + (seconds / 60);
          }),
          backgroundColor: colors[index % colors.length],
          stack: 'stack',
        }))
      : [{
          label: 'データなし',
          data: [0],
          backgroundColor: colors[0],
          stack: 'stack',
        }],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        type: 'category',
        grid: {
          display: true,
        },
        border: {
          display: true,
        },
      },
      y: {
        stacked: true,
        type: 'linear',
        min: 0,
        max: calculateMaxValue(),
        grid: {
          display: true,
        },
        border: {
          display: true,
        },
        ticks: {
          callback: function(value) {
            if (typeof value !== 'number') return value;
            const totalMinutes = value;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);
            const seconds = Math.round((totalMinutes % 1) * 60);
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (typeof context.parsed.y !== 'number') return '';
            const totalMinutes = context.parsed.y;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);
            const seconds = Math.round((totalMinutes % 1) * 60);
            return `${context.dataset.label}: ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          },
        },
      },
    },
  };

  // データが空の場合のメッセージを表示
  if (!monthlyDistribution || monthlyDistribution.length === 0) {
    return (
      <Box h="400px" w="100%" p={4} display="flex" alignItems="center" justifyContent="center">
        <Text color="gray.500">表示するデータがありません</Text>
      </Box>
    );
  }

  return (
    <Box h="400px" w="100%" p={4}>
      <Bar data={data} options={options} />
    </Box>
  );
}