'use client';

import React from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  Text,
  Card,
  CardBody,
  Badge,
  Button,
  Flex,
  Spinner,
  Center,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { TimeIcon } from '@chakra-ui/icons';
import { useAssignedTasks } from '@/hooks/useAssignedTasks';
import { useTimeEntry } from '@/contexts/TimeEntryContext';

export default function TasksPage() {
  const { tasks, loading, error } = useAssignedTasks();
  const { startTimer, stopTimer, activeEntry, isLoading } = useTimeEntry();

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100vh">
        <Text>タスクの読み込みに失敗しました</Text>
      </Center>
    );
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg">マイタスク</Heading>
          {activeEntry && (
            <Flex align="center" gap={2}>
              <TimeIcon color="green.500" />
              <Text>作業時間: {formatDuration(new Date(activeEntry.start_time))}</Text>
            </Flex>
          )}
        </Flex>

        {!tasks.length && !activeEntry ? (
          <Card>
            <CardBody>
              <Text>現在、割り当てられているタスクはありません。</Text>
            </CardBody>
          </Card>
        ) : (
          tasks.map(task => {
            const isActive = activeEntry?.task_id === task.id;
            return (
              <Card
                key={task.id}
                borderWidth={isActive ? "2px" : "1px"}
                borderColor={isActive ? "green.500" : "gray.200"}
                bg={isActive ? "green.50" : "white"}
              >
                <CardBody>
                  <Flex justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Flex alignItems="center" gap={2} mb={2}>
                        <Heading size="md">
                          {task.title}
                        </Heading>
                        {isActive && (
                          <Badge colorScheme="green" fontSize="sm">実行中</Badge>
                        )}
                      </Flex>
                      <Text color="gray.600" mb={3}>
                        {task.project.name}
                      </Text>
                      {task.description && (
                        <Text mb={3}>{task.description}</Text>
                      )}
                      {task.due_date && (
                        <Badge colorScheme="blue">
                          期限: {new Date(task.due_date).toLocaleDateString()}
                        </Badge>
                      )}
                    </Box>
                    <Box ml={4}>
                      {isActive ? (
                        <Button
                          leftIcon={<TimeIcon />}
                          colorScheme="red"
                          onClick={() => stopTimer()}
                          isLoading={isLoading}
                        >
                          記録を終了
                        </Button>
                      ) : (
                        <Button
                          leftIcon={<TimeIcon />}
                          colorScheme="brand"
                          isLoading={isLoading}
                          onClick={() => startTimer(task.project_id, task.id)}
                          isDisabled={!!activeEntry}
                        >
                          時間を記録
                        </Button>
                      )}
                    </Box>
                  </Flex>
                </CardBody>
              </Card>
            );
          })
        )}
      </VStack>
    </Container>
  );
}

function formatDuration(startTime: Date) {
  const now = new Date();
  const diff = now.getTime() - startTime.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
}