'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  useToast,
  Spinner,
  Center,
  Text,
} from '@chakra-ui/react';
import { supabase } from '@/lib/supabase';
import { TimeEntryWithDetails } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { TimeEntryList } from '@/components/TimeEntryList';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';

export default function TimeSheetPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // 選択された日付のエントリーをフィルタリング
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.start_time);
    return (
      entryDate.getFullYear() === selectedDate.getFullYear() &&
      entryDate.getMonth() === selectedDate.getMonth() &&
      entryDate.getDate() === selectedDate.getDate()
    );
  });

  // 週の開始日と終了日を取得
  const getWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  };

  // 作業記録を取得する関数
  const fetchTimeEntries = useCallback(
    async (targetDate: Date = currentDate) => {
      if (!user) return;

      const { startOfWeek, endOfWeek } = getWeekRange(targetDate);
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('time_entries')
          .select(`
            *,
            task:tasks(id, title),
            user:profiles(id, full_name)
          `)
          .eq('user_id', user.id)
          .gte('start_time', startOfWeek.toISOString())
          .lte('start_time', endOfWeek.toISOString())
          .order('start_time', { ascending: false });

        if (error) throw error;

        if (data) {
          setEntries(data as TimeEntryWithDetails[]);
        } else {
          setEntries([]);
        }
      } catch (error) {
        console.error('Error fetching time entries:', error);
        toast({
          title: '作業記録の取得に失敗しました',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    },
    [user, toast, currentDate]
  );

  useEffect(() => {
    if (!user) return;
    fetchTimeEntries(currentDate);
  }, [user, fetchTimeEntries, currentDate]);

  // 作業時間の計算（分単位）
  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return 0;
    const startTime = new Date(start);
    const endTime = new Date(end);
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  };

  // 作業時間のフォーマット（時間：分）
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="lg">タイムシート</Heading>

        <WeeklyCalendar
          currentDate={currentDate}
          onDateChange={(newDate) => {
            setCurrentDate(newDate);
          }}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          entries={entries}
          calculateDuration={calculateDuration}
          formatDuration={formatDuration}
        />

        <Heading as="h2" size="md" mb={4}>
          {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日の作業記録
        </Heading>

        <Box position="relative" minH="200px">
          {isLoading && (
            <Center
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              bg="whiteAlpha.900"
              zIndex={1}
            >
              <VStack>
                <Spinner size="xl" color="brand.500" thickness="4px" />
                <Text color="gray.600" fontSize="sm">データを取得中...</Text>
              </VStack>
            </Center>
          )}
          <TimeEntryList
            entries={filteredEntries}
            onEntryChange={fetchTimeEntries}
            taskId=""
            projectId=""
            hideTimeControls={true}
          />
        </Box>
      </VStack>
    </Container>
  );
}