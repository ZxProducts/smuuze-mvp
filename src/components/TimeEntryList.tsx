'use client';

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { TimeIcon, DeleteIcon } from '@chakra-ui/icons';
import { supabase } from '@/lib/supabase';
import {
  TimeEntryWithUser,
  TimeEntryInsert,
  TimeEntry,
} from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';

interface TimeEntryListProps {
  entries: TimeEntryWithUser[];
  taskId: string;
  projectId: string;
  onEntryChange?: () => void;
}

export function TimeEntryList({
  entries,
  taskId,
  projectId,
  onEntryChange,
}: TimeEntryListProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeEntry, setActiveEntry] = useState<TimeEntryWithUser | null>(
    entries.find(entry => !entry.end_time && entry.user_id === user?.id) || null
  );

  const startTimer = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const newEntry: TimeEntryInsert = {
        task_id: taskId,
        project_id: projectId,
        user_id: user.id,
        start_time: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('time_entries')
        .insert([newEntry]);

      if (error) throw error;

      onEntryChange?.();
      toast({
        title: '時間計測を開始しました',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error starting timer:', error);
      toast({
        title: '時間計測の開始に失敗しました',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopTimer = async (entryId: string) => {
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      onEntryChange?.();
      toast({
        title: '時間計測を停止しました',
        status: 'success',
        duration: 3000,
      });
      setActiveEntry(null);
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast({
        title: '時間計測の停止に失敗しました',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diffInMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}時間${minutes}分`;
  };

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Button
          leftIcon={<TimeIcon />}
          colorScheme="brand"
          onClick={startTimer}
          isLoading={isLoading}
          isDisabled={!!activeEntry}
        >
          計測開始
        </Button>
      </HStack>

      <VStack spacing={2} align="stretch">
        {entries.map(entry => (
          <Box
            key={entry.id}
            p={3}
            borderWidth={1}
            borderRadius="md"
            borderColor={!entry.end_time ? 'brand.500' : undefined}
          >
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold">{entry.user.full_name}</Text>
                <Text fontSize="sm" color="gray.500">
                  {new Date(entry.start_time).toLocaleString()} -{' '}
                  {entry.end_time
                    ? new Date(entry.end_time).toLocaleString()
                    : '記録中'}
                </Text>
                <Text fontSize="sm">
                  経過時間: {formatDuration(entry.start_time, entry.end_time)}
                </Text>
              </VStack>
              {!entry.end_time && entry.user_id === user?.id && (
                <IconButton
                  aria-label="Stop timer"
                  icon={<TimeIcon />}
                  onClick={() => stopTimer(entry.id)}
                  isLoading={isLoading}
                  colorScheme="brand"
                />
              )}
            </HStack>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
}