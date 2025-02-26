'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Box, Text, VStack } from '@chakra-ui/react';
import { TimeStats } from '@/types/api';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ProjectPieChartProps {
  totalTime: string;
  projectDistribution: TimeStats['projectDistribution'];
}

export default function ProjectPieChart({ totalTime, projectDistribution }: ProjectPieChartProps) {
  // カラーパレットの定義
  const colors = [
    'rgba(75, 192, 192, 0.7)',  // 緑
    'rgba(153, 102, 255, 0.7)', // 紫
    'rgba(255, 159, 64, 0.7)',  // オレンジ
    'rgba(255, 205, 86, 0.7)',  // 黄
    'rgba(255, 99, 132, 0.7)',  // 赤
  ];

  const data: ChartData<'pie'> = {
    labels: projectDistribution.map(p => p.project_name),
    datasets: [{
      data: projectDistribution.map(p => p.percentage),
      backgroundColor: colors,
      borderColor: colors.map(c => c.replace('0.7', '1')),
      borderWidth: 1,
    }],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // 凡例を非表示（下のリストで表示するため）
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const project = projectDistribution[context.dataIndex];
            return `${project.project_name}: ${project.time} (${project.percentage.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  return (
    <Box>
      <VStack spacing={4} alignItems="center">
        <Box position="relative" h="300px" w="100%">
          <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" textAlign="center">
            <Text fontSize="sm" color="gray.600">Total time</Text>
            <Text fontSize="2xl" fontWeight="bold">{totalTime}</Text>
          </Box>
          <Pie data={data} options={options} />
        </Box>
      </VStack>
    </Box>
  );
}