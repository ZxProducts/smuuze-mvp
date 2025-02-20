'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  useToast,
  Textarea,
} from '@chakra-ui/react';
import { TimeIcon, EditIcon } from '@chakra-ui/icons';
import {
  TimeEntryWithDetails,
} from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeEntry } from '@/contexts/TimeEntryContext';
import { TimeEntryEditModal } from './TimeEntryEditModal';

interface TimeEntryListProps {
  entries: TimeEntryWithDetails[];
  taskId: string;
  projectId: string;
  onEntryChange?: () => void;
  hideTimeControls?: boolean;
}

interface GroupedTimeEntry {
  date: string;
  entries: TimeEntryWithDetails[];
  totalDuration: number;
}

export function TimeEntryList({
  entries,
  taskId,
  projectId,
  onEntryChange,
  hideTimeControls = false,
}: TimeEntryListProps) {
  const { user } = useAuth();
  const { activeEntry, startTimer, stopTimer, isLoading: isTimerLoading } = useTimeEntry();
  const toast = useToast();
  const [groupedEntries, setGroupedEntries] = useState<GroupedTimeEntry[]>([]);
  const [description, setDescription] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithDetails | null>(null);

  // エントリーのグループ化
  const getDateRange = useCallback((): { start: Date; end: Date } => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }, []);

  useEffect(() => {
    const { start, end } = getDateRange();
    
    // 日付ごとにグループ化
    const groupedByDate = entries.reduce((groups: { [key: string]: TimeEntryWithDetails[] }, entry) => {
      const date = new Date(entry.start_time).toLocaleDateString('ja-JP');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {});

    // グループごとの合計時間を計算
    const groupedResult = Object.entries(groupedByDate).map(([date, dateEntries]) => ({
      date,
      entries: dateEntries,
      totalDuration: dateEntries.reduce(
        (total, entry) => total + calculateDuration(entry.start_time, entry.end_time),
        0
      ),
    }));

    // 日付でソート（降順）
    groupedResult.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setGroupedEntries(groupedResult);
  }, [entries, taskId, getDateRange]);

  const calculateDuration = (start: string, end: string | null): number => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}時間${remainingMinutes}分`;
  };

  const handleStartTimer = async () => {
    if (!user || !taskId) return;

    try {
      await startTimer(projectId, taskId);
      onEntryChange?.();
      setDescription('');
    } catch (error) {
      console.error('Error starting timer:', error);
      toast({
        title: '時間計測の開始に失敗しました',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleStopTimer = async () => {
    if (!activeEntry) return;

    try {
      await stopTimer();
      await onEntryChange?.();
      setDescription('');
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast({
        title: '時間計測の停止に失敗しました',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // 期間の合計時間を計算
  const calculateTotalPeriodDuration = useCallback(() => {
    return groupedEntries.reduce((total, group) => total + group.totalDuration, 0);
  }, [groupedEntries]);

  return (
    <VStack spacing={4} align="stretch">
      {!hideTimeControls && (
        <Box mb={6}>
          {activeEntry?.task_id === taskId ? (
            <Box p={4} borderWidth={1} borderRadius="md" borderColor="brand.500">
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color="gray.600">作業内容: {activeEntry.description || '未入力'}</Text>
                <HStack justify="flex-end">
                  <Button
                    leftIcon={<TimeIcon />}
                    colorScheme="red"
                    onClick={handleStopTimer}
                    isLoading={isTimerLoading}
                  >
                    計測停止
                  </Button>
                </HStack>
              </VStack>
            </Box>
          ) : (
            <Box p={4} borderWidth={1} borderRadius="md">
              <VStack spacing={3} align="stretch">
                <Textarea
                  placeholder="作業内容を入力してください（任意）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  resize="vertical"
                  rows={2}
                />
                <HStack justify="flex-end">
                  <Button
                    leftIcon={<TimeIcon />}
                    colorScheme="brand"
                    onClick={handleStartTimer}
                    isLoading={isTimerLoading}
                    isDisabled={!!activeEntry}
                  >
                    計測開始
                  </Button>
                </HStack>
              </VStack>
            </Box>
          )}
        </Box>
      )}

      <Box mb={4}>
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between" mb={4}>
            <Text fontSize="lg" fontWeight="bold">作業履歴</Text>
            <Text fontSize="md" color="gray.600">
            合計作業時間: {formatDuration(calculateTotalPeriodDuration())}
            </Text>
          </HStack>

          <VStack spacing={6} align="stretch" mt={4}>
            {groupedEntries.length > 0 ? (
              groupedEntries.map(group => (
                <Box key={group.date}>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="md" fontWeight="bold">{group.date}</Text>
                    <Text fontSize="sm" color="gray.600">
                      合計: {formatDuration(group.totalDuration)}
                    </Text>
                  </HStack>
                  <VStack spacing={2} align="stretch">
                    {group.entries.map(entry => (
                      <Box
                        key={entry.id}
                        p={3}
                        borderWidth={1}
                        borderRadius="md"
                        borderColor={!entry.end_time ? 'brand.500' : undefined}
                      >
                        <HStack justify="space-between">
                          <VStack align="start" spacing={2} flex={1}>
                            <HStack width="100%" justify="space-between">
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" color="gray.600">
                                  作業者: {entry.user.full_name}
                                </Text>
                                {entry.task && (
                                  <Text fontSize="sm" color="gray.600">
                                    タスク: {entry.task.title}
                                  </Text>
                                )}
                              </VStack>
                              <Text fontSize="sm" fontWeight="medium">
                                {formatDuration(calculateDuration(entry.start_time, entry.end_time))}
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color="gray.500">
                              {new Date(entry.start_time).toLocaleTimeString()} -{' '}
                              {entry.end_time
                                ? new Date(entry.end_time).toLocaleTimeString()
                                : '記録中'}
                            </Text>
                            {entry.description && (
                              <Text fontSize="sm" color="gray.600">
                                {entry.description}
                              </Text>
                            )}
                          </VStack>
                          <HStack>
                            {entry.user_id === user?.id && entry.end_time && (
                              <IconButton
                                aria-label="Edit entry"
                                icon={<EditIcon />}
                                onClick={() => setEditingEntry(entry)}
                                colorScheme="brand"
                                variant="ghost"
                                size="sm"
                              />
                            )}
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              ))
            ) : (
              <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
                <Text textAlign="center" color="gray.600">
                  この期間の作業記録はありません
                </Text>
              </Box>
            )}
          </VStack>
        </VStack>
      </Box>

      {editingEntry && (
        <TimeEntryEditModal
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          entry={editingEntry}
          onUpdate={onEntryChange || (() => {})}
        />
      )}
    </VStack>
  );
}