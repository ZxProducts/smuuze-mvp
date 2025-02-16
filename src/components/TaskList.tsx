'use client';

import React from 'react';
import {
  VStack,
  Box,
  Heading,
  Text,
  Badge,
  HStack,
  Progress,
} from '@chakra-ui/react';
import Link from 'next/link';
import { TaskRow } from '@/lib/supabase';

interface TaskWithAssignee extends TaskRow {
  assignee?: {
    id: string;
    full_name: string;
  };
}

interface TaskListProps {
  tasks: TaskWithAssignee[];
}

export function TaskList({ tasks }: TaskListProps) {
  const getStatusColor = (status: TaskRow['status']) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getPriorityColor = (priority: TaskRow['priority']) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      default:
        return 'gray';
    }
  };

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

  // タスクの進捗状況の計算
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const progressPercentage = (completedTasks / totalTasks) * 100;

  return (
    <VStack spacing={6} align="stretch">
      <Box mb={4}>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" color="gray.600">
            全{totalTasks}タスク中 {completedTasks}タスク完了
          </Text>
          <Text fontSize="sm" fontWeight="bold" color="brand.500">
            {progressPercentage.toFixed(1)}%
          </Text>
        </HStack>
        <Progress
          value={progressPercentage}
          colorScheme="brand"
          size="sm"
          borderRadius="full"
        />
      </Box>

      {tasks.map(task => (
        <Box
          key={task.id}
          as={Link}
          href={`/projects/${task.project_id}/tasks/${task.id}`}
          p={4}
          borderWidth={1}
          borderRadius="lg"
          _hover={{
            borderColor: 'brand.500',
            transform: 'translateY(-2px)',
            boxShadow: 'sm',
          }}
          transition="all 0.2s"
        >
          <HStack justify="space-between" mb={2}>
            <Heading size="sm">{task.title}</Heading>
            <HStack spacing={2}>
              <Badge colorScheme={getPriorityColor(task.priority)}>
                {task.priority === 'high' ? '高' :
                 task.priority === 'medium' ? '中' : '低'}
              </Badge>
              <Badge colorScheme={getStatusColor(task.status)}>
                {task.status === 'completed' ? '完了' :
                 task.status === 'in_progress' ? '進行中' : '未着手'}
              </Badge>
            </HStack>
          </HStack>

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
      ))}
    </VStack>
  );
}