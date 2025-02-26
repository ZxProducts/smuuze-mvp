'use client';

import React from 'react';
import {
  VStack,
  Box,
  Heading,
  Text,
  HStack,
  Button,
  Flex,
} from '@chakra-ui/react';
import Link from 'next/link';
import { Task } from '@/types/database.types';
import { useTimeEntry } from '@/contexts/TimeEntryContext';
import { TimeIcon } from '@chakra-ui/icons';

interface TaskWithAssignee extends Task {
  status: 'not_started' | 'in_progress' | 'completed';
  assignee?: {
    id: string;
    full_name: string;
  };
}

interface TaskListProps {
  tasks: TaskWithAssignee[];
}

// タイマーコントロールコンポーネント
const TaskTimer: React.FC<{ task: TaskWithAssignee }> = ({ task }) => {
  const { activeEntry, startTimer, stopTimer, isLoading } = useTimeEntry();
  const isCurrentTaskActive = activeEntry?.task_id === task.id;
  const isOtherTaskActive = activeEntry && !isCurrentTaskActive;

  return (
    <Button
      leftIcon={<TimeIcon />}
      colorScheme={isCurrentTaskActive ? "red" : "brand"}
      onClick={(e) => {
        e.preventDefault(); // リンクのクリックを防止
        isCurrentTaskActive ? stopTimer() : startTimer(task.project_id, task.id);
      }}
      isLoading={isLoading}
      isDisabled={!!isOtherTaskActive}
      size="sm"
    >
      {isCurrentTaskActive ? "作業を終了" : "作業を開始"}
    </Button>
  );
};

export function TaskList({ tasks }: TaskListProps) {
  const { activeEntry } = useTimeEntry();

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (tasks.length === 0) {
    return (
      <Box p={8} textAlign="center">
        <Text color="gray.600">タスクはまだ作成されていません</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {tasks.map(task => {
        const isActive = activeEntry?.task_id === task.id;
        return (
          <Box
            key={task.id}
            p={4}
            borderWidth={isActive ? "2px" : "1px"}
            borderColor={isActive ? "green.500" : "gray.200"}
            bg={isActive ? "green.50" : "white"}
            borderRadius="lg"
            _hover={{
              borderColor: isActive ? "green.500" : 'brand.500',
              transform: 'translateY(-2px)',
              boxShadow: 'sm',
            }}
            transition="all 0.2s"
          >
            <Flex justifyContent="space-between" alignItems="flex-start" gap={4}>
              <Box as={Link} href={`/projects/${task.project_id}/tasks/${task.id}`} flex={1}>
                <Heading size="sm" mb={2}>{task.title}</Heading>
                {task.description && (
                  <Text color="gray.600" noOfLines={2} mb={2}>
                    {task.description}
                  </Text>
                )}
                <HStack spacing={4} fontSize="sm" color="gray.500">
                  {task.assignee && (
                    <Text>担当: {task.assignee.full_name}</Text>
                  )}
                  {task.due_date && (
                    <Text>期限: {formatDate(task.due_date)}</Text>
                  )}
                </HStack>
              </Box>
              <TaskTimer task={task} />
            </Flex>
          </Box>
        );
      })}
    </VStack>
  );
}