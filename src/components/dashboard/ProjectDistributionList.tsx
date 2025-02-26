'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
} from '@chakra-ui/react';
import { TimeStats } from '@/types/api';

interface ProjectDistributionListProps {
  projectDistribution: TimeStats['projectDistribution'];
}

// カラーパレットの定義（円グラフと同じ色を使用）
const colors = [
  'rgba(75, 192, 192, 1)',  // 緑
  'rgba(153, 102, 255, 1)', // 紫
  'rgba(255, 159, 64, 1)',  // オレンジ
  'rgba(255, 205, 86, 1)',  // 黄
  'rgba(255, 99, 132, 1)',  // 赤
];

export default function ProjectDistributionList({ projectDistribution }: ProjectDistributionListProps) {
  return (
    <VStack spacing={4} align="stretch" w="100%">
      {projectDistribution.map((project, index) => (
        <Box key={project.project_id}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="sm" fontWeight="medium">
              {project.project_name}
            </Text>
            <HStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                {project.time}
              </Text>
              <Text fontSize="sm" color="gray.600" w="60px" textAlign="right">
                {project.percentage.toFixed(1)}%
              </Text>
            </HStack>
          </HStack>
          <Progress
            value={project.percentage}
            size="sm"
            borderRadius="full"
            backgroundColor="gray.100"
            sx={{
              '& > div': {
                backgroundColor: colors[index % colors.length],
              }
            }}
          />
        </Box>
      ))}
    </VStack>
  );
}