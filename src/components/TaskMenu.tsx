import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Text,
  Box,
  Spinner,
  Center,
  MenuDivider,
  Flex,
} from '@chakra-ui/react';
import { ChevronDownIcon, TimeIcon } from '@chakra-ui/icons';
import { useAssignedTasks } from '@/hooks/useAssignedTasks';
import { useTimeEntry } from '@/contexts/TimeEntryContext';

export function TaskMenu() {
  const { tasks, loading, error } = useAssignedTasks();
  const { startTimer, stopTimer, activeEntry, isLoading } = useTimeEntry();

  const handleStartTimer = async (projectId: string, taskId: string) => {
    await startTimer(projectId, taskId);
  };

  if (loading) {
    return (
      <Button variant="ghost" isLoading>
        タスク読み込み中...
      </Button>
    );
  }

  if (error) {
    return (
      <Button variant="ghost" isDisabled>
        タスクの読み込みに失敗しました
      </Button>
    );
  }

  if (!tasks.length && !activeEntry) {
    return (
      <Button variant="ghost" isDisabled>
        割り当てタスクなし
      </Button>
    );
  }

  return (
    <Menu>
      <MenuButton
        as={Button}
        variant={activeEntry ? 'solid' : 'ghost'}
        colorScheme={activeEntry ? 'green' : 'gray'}
        rightIcon={<ChevronDownIcon />}
        isLoading={isLoading}
        minW="200px"
      >
        <Flex alignItems="center" gap={2}>
          {activeEntry ? (
            <>
              <TimeIcon />
              <Box>
                <Text fontSize="sm" fontWeight="normal">記録中:</Text>
                <Text fontSize="sm" fontWeight="bold" maxW="150px" isTruncated>
                  {activeEntry.task?.title || '作業中'}
                </Text>
              </Box>
            </>
          ) : (
            <>
              <TimeIcon />
              <Text>タスク選択</Text>
            </>
          )}
        </Flex>
      </MenuButton>
      <MenuList>
        {activeEntry ? (
          <MenuItem onClick={() => stopTimer()} color="red.500">
            作業を終了
          </MenuItem>
        ) : (
          tasks.map(task => (
            <MenuItem
              key={task.id}
              onClick={() => handleStartTimer(task.project_id, task.id)}
            >
              <Box>
                <Text fontWeight="bold">{task.title}</Text>
                <Text fontSize="sm" color="gray.600">
                  {task.project.name}
                </Text>
              </Box>
            </MenuItem>
          ))
        )}
      </MenuList>
    </Menu>
  );
}