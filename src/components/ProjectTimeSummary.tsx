'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  VStack,
  HStack,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Collapse,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { Task, TimeEntryWithDetails } from '@/types/database.types';

interface TaskWithTimeEntries {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
  team_id: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  time_entries: TimeEntryWithDetails[];
}

interface ProjectTimeSummaryProps {
  tasks: TaskWithTimeEntries[];
}

interface UserSummary {
  user_id: string;
  full_name: string;
  total_minutes: number;
}

interface TaskSummary {
  task_id: string;
  title: string;
  total_minutes: number;
  contributor_count: number;
  entries: TimeEntryWithDetails[];
}

export function ProjectTimeSummary({ tasks }: ProjectTimeSummaryProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

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
        };

        existing.total_minutes += calculateDuration(entry.start_time, entry.end_time);
        summaries.set(entry.user.id, existing);
      });
    });

    return Array.from(summaries.values())
      .sort((a, b) => b.total_minutes - a.total_minutes);
  };

  const calculateTaskSummaries = (): TaskSummary[] => {
    // タスクがないエントリーをまとめる
    const entriesWithoutTask: TimeEntryWithDetails[] = [];
    const entriesByTask = new Map<string, TimeEntryWithDetails[]>();

    tasks.forEach(task => {
      task.time_entries.forEach(entry => {
        if (!entry.task || !entry.task.id) {
          entriesWithoutTask.push(entry);
        } else {
          const entries = entriesByTask.get(entry.task.id) || [];
          entries.push(entry);
          entriesByTask.set(entry.task.id, entries);
        }
      });
    });

    const taskSummaries: TaskSummary[] = [];

    // タスクなしのエントリーがある場合、まとめて追加
    if (entriesWithoutTask.length > 0) {
      const contributors = new Set(entriesWithoutTask.map(entry => entry.user.id));
      const totalMinutes = entriesWithoutTask.reduce(
        (total, entry) => total + calculateDuration(entry.start_time, entry.end_time),
        0
      );

      taskSummaries.push({
        task_id: 'no-task',
        title: 'タスクなし',
        total_minutes: totalMinutes,
        contributor_count: contributors.size,
        entries: entriesWithoutTask,
      });
    }

    // タスクがあるエントリーを追加
    entriesByTask.forEach((entries, taskId) => {
      const task = tasks.find(t => entries.some(e => e.task?.id === t.id));
      if (!task) return;

      const contributors = new Set(entries.map(entry => entry.user.id));
      const totalMinutes = entries.reduce(
        (total, entry) => total + calculateDuration(entry.start_time, entry.end_time),
        0
      );

      taskSummaries.push({
        task_id: taskId,
        title: task.title,
        total_minutes: totalMinutes,
        contributor_count: contributors.size,
        entries: entries,
      });
    });

    return taskSummaries.sort((a, b) => b.total_minutes - a.total_minutes);
  };

  const getTotalStats = () => {
    const allEntries = tasks.flatMap(task => task.time_entries);
    const totalMinutes = allEntries.reduce(
      (total, entry) => total + calculateDuration(entry.start_time, entry.end_time),
      0
    );
    const uniqueUsers = new Set(allEntries.map(entry => entry.user.id)).size;

    return {
      totalMinutes,
      uniqueUsers,
    };
  };

  const userSummaries = calculateUserSummaries();
  const taskSummaries = calculateTaskSummaries();
  const totalStats = getTotalStats();

  return (
    <VStack spacing={8} align="stretch">
      {/* 全体の統計 */}
      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
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
      </Grid>

      {/* メンバー別作業時間 */}
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4}>メンバー別作業時間</Text>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>メンバー</Th>
              <Th>作業時間</Th>
            </Tr>
          </Thead>
          <Tbody>
            {userSummaries.map(summary => (
              <Tr key={summary.user_id}>
                <Td fontWeight="medium">{summary.full_name}</Td>
                <Td>{getTimeString(summary.total_minutes)}</Td>
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
            <Box key={task.task_id} borderWidth={1} borderRadius="md" overflow="hidden">
              <HStack
                p={4}
                justify="space-between"
                bg="gray.50"
                cursor="pointer"
                onClick={() => toggleTaskExpand(task.task_id)}
              >
                <HStack justify="space-between" width="100%">
                  <Box>
                    <Text fontWeight="bold">{task.title}</Text>
                    <Text fontSize="sm" color="gray.600">
                      合計: {getTimeString(task.total_minutes)} (作業者: {task.contributor_count}人)
                    </Text>
                  </Box>
                  <IconButton
                    aria-label="Toggle entries"
                    icon={expandedTasks.has(task.task_id) ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    variant="ghost"
                  />
                </HStack>
              </HStack>

              <Collapse in={expandedTasks.has(task.task_id)}>
                <VStack spacing={2} p={4} align="stretch">
                  {task.entries.map(entry => (
                    <Box
                      key={entry.id}
                      p={3}
                      borderWidth={1}
                      borderRadius="md"
                      borderColor={!entry.end_time ? 'brand.500' : undefined}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="medium">
                          {entry.user.full_name}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {getTimeString(calculateDuration(entry.start_time, entry.end_time))}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(entry.start_time).toLocaleString()} -{' '}
                        {entry.end_time
                          ? new Date(entry.end_time).toLocaleString()
                          : '記録中'}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Collapse>
            </Box>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}