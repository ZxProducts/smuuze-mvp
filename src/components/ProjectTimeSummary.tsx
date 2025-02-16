'use client';

import React from 'react';
import {
  Box,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  Tooltip,
  VStack,
  HStack,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from '@chakra-ui/react';
import { TaskRow, TimeEntryRow } from '@/lib/supabase';

interface TimeEntryWithUser extends TimeEntryRow {
  user: {
    id: string;
    full_name: string;
  };
}

interface TaskWithTimeEntries extends TaskRow {
  time_entries: TimeEntryWithUser[];
}

interface ProjectTimeSummaryProps {
  tasks: TaskWithTimeEntries[];
}

interface UserSummary {
  user_id: string;
  full_name: string;
  total_minutes: number;
  completed_tasks: number;
  in_progress_tasks: number;
}

interface TaskSummary {
  task_id: string;
  title: string;
  status: TaskRow['status'];
  total_minutes: number;
  contributor_count: number;
}

export function ProjectTimeSummary({ tasks }: ProjectTimeSummaryProps) {
  const calculateDuration = (start: string, end: string | null): number => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  };

  const getTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}時間${remainingMinutes}分`;
  };

  const calculateUserSummaries = (): UserSummary[] => {
    const summaries = new Map<string, UserSummary>();

    tasks.forEach(task => {
      task.time_entries.forEach(entry => {
        const existing = summaries.get(entry.user.id) || {
          user_id: entry.user.id,
          full_name: entry.user.full_name,
          total_minutes: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
        };

        existing.total_minutes += calculateDuration(entry.start_time, entry.end_time);

        if (task.status === 'completed') {
          existing.completed_tasks++;
        } else if (task.status === 'in_progress') {
          existing.in_progress_tasks++;
        }

        summaries.set(entry.user.id, existing);
      });
    });

    return Array.from(summaries.values())
      .sort((a, b) => b.total_minutes - a.total_minutes);
  };

  const calculateTaskSummaries = (): TaskSummary[] => {
    return tasks.map(task => {
      const contributors = new Set(task.time_entries.map(entry => entry.user.id));
      const totalMinutes = task.time_entries.reduce(
        (total, entry) => total + calculateDuration(entry.start_time, entry.end_time),
        0
      );

      return {
        task_id: task.id,
        title: task.title,
        status: task.status,
        total_minutes: totalMinutes,
        contributor_count: contributors.size,
      };
    }).sort((a, b) => b.total_minutes - a.total_minutes);
  };

  const getTotalStats = () => {
    const allEntries = tasks.flatMap(task => task.time_entries);
    const totalMinutes = allEntries.reduce(
      (total, entry) => total + calculateDuration(entry.start_time, entry.end_time),
      0
    );
    const uniqueUsers = new Set(allEntries.map(entry => entry.user.id)).size;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;

    return {
      totalMinutes,
      uniqueUsers,
      completedTasks,
      inProgressTasks,
    };
  };

  const userSummaries = calculateUserSummaries();
  const taskSummaries = calculateTaskSummaries();
  const totalStats = getTotalStats();

  return (
    <VStack spacing={8} align="stretch">
      {/* 全体の統計 */}
      <Grid templateColumns="repeat(4, 1fr)" gap={4}>
        <GridItem>
          <Stat>
            <StatLabel>総作業時間</StatLabel>
            <StatNumber>{getTimeString(totalStats.totalMinutes)}</StatNumber>
            <StatHelpText>全メンバーの合計</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat>
            <StatLabel>作業者数</StatLabel>
            <StatNumber>{totalStats.uniqueUsers}人</StatNumber>
            <StatHelpText>ユニークなメンバー</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat>
            <StatLabel>完了タスク</StatLabel>
            <StatNumber>{totalStats.completedTasks}</StatNumber>
            <StatHelpText>全{tasks.length}タスク中</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat>
            <StatLabel>進行中タスク</StatLabel>
            <StatNumber>{totalStats.inProgressTasks}</StatNumber>
            <StatHelpText>現在作業中</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      {/* メンバー別作業時間 */}
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4}>メンバー別作業時間</Text>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>メンバー</Th>
              <Th>作業時間</Th>
              <Th>完了タスク</Th>
              <Th>進行中タスク</Th>
            </Tr>
          </Thead>
          <Tbody>
            {userSummaries.map(summary => (
              <Tr key={summary.user_id}>
                <Td fontWeight="medium">{summary.full_name}</Td>
                <Td>{getTimeString(summary.total_minutes)}</Td>
                <Td>
                  <Badge colorScheme="green">{summary.completed_tasks}</Badge>
                </Td>
                <Td>
                  <Badge colorScheme="blue">{summary.in_progress_tasks}</Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* タスク別作業時間 */}
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4}>タスク別作業時間</Text>
        <VStack spacing={4} align="stretch">
          {taskSummaries.map(task => (
            <Box key={task.task_id} p={4} bg="gray.50" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="bold">{task.title}</Text>
                <Badge
                  colorScheme={
                    task.status === 'completed' ? 'green' :
                    task.status === 'in_progress' ? 'blue' : 'gray'
                  }
                >
                  {task.status === 'completed' ? '完了' :
                   task.status === 'in_progress' ? '進行中' : '未着手'}
                </Badge>
              </HStack>
              <Text color="gray.600" mb={2}>
                合計: {getTimeString(task.total_minutes)} (作業者: {task.contributor_count}人)
              </Text>
              <Progress
                value={task.total_minutes}
                max={Math.max(...taskSummaries.map(t => t.total_minutes))}
                colorScheme="brand"
                size="sm"
              />
            </Box>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}