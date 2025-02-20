'use client';

import React from 'react';
import {
  Box,
  Grid,
  Text,
  HStack,
  IconButton,
  VStack,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { TimeEntryWithDetails } from '@/types/database.types';

interface WeeklyCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  entries: TimeEntryWithDetails[];
  calculateDuration: (start: string, end: string | null) => number;
  formatDuration: (minutes: number) => string;
}

export function WeeklyCalendar({
  currentDate,
  onDateChange,
  selectedDate,
  onDateSelect,
  entries,
  calculateDuration,
  formatDuration,
}: WeeklyCalendarProps) {
  // 週の開始日（日曜日）を取得
  const getStartOfWeek = (date: Date) => {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() - result.getDay());
    result.setHours(0, 0, 0, 0);
    return result;
  };

  // 週の終了日（土曜日）を取得
  const getEndOfWeek = (date: Date) => {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() - result.getDay() + 6);
    result.setHours(23, 59, 59, 999);
    return result;
  };

  // 前の週へ
  const handlePrevWeek = () => {
    console.log('Moving to previous week');
    const newDate = new Date(currentDate.getTime());
    newDate.setDate(newDate.getDate() - 7);
    console.log('New date:', newDate); // 追加
    onDateChange(newDate);
  };

  // 次の週へ
  const handleNextWeek = () => {
    console.log('Moving to next week');
    const newDate = new Date(currentDate.getTime());
    newDate.setDate(newDate.getDate() + 7);
    console.log('New date:', newDate); // 追加
    onDateChange(newDate);
  };

  // 週の日付配列を生成
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(getStartOfWeek(currentDate));
    date.setDate(date.getDate() + i);
    return date;
  });

  // 各日の合計作業時間を計算
  const getDailyTotal = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return entries
      .filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= dayStart && entryDate <= dayEnd;
      })
      .reduce((total, entry) => 
        total + calculateDuration(entry.start_time, entry.end_time),
        0
      );
  };

  // 週の開始日と終了日のフォーマット
  const formatDateRange = () => {
    const startDate = getStartOfWeek(currentDate);
    const endDate = getEndOfWeek(currentDate);
    const formatDate = (date: Date) => {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    };
    return `${formatDate(startDate)} 〜 ${formatDate(endDate)}`;
  };

  return (
    <Box borderWidth={1} borderRadius="lg" p={4} bg="white" shadow="sm">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="center">
          <IconButton
            aria-label="Previous week"
            icon={<ChevronLeftIcon />}
            onClick={handlePrevWeek}
            variant="ghost"
          />
          <Text fontSize="lg" fontWeight="bold">
            {formatDateRange()}
          </Text>
          <IconButton
            aria-label="Next week"
            icon={<ChevronRightIcon />}
            onClick={handleNextWeek}
            variant="ghost"
          />
        </HStack>

        <Grid templateColumns="repeat(7, 1fr)" gap={2}>
          {weekDates.map((date, index) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const dailyTotal = getDailyTotal(date);

            return (
              <Box
                key={index}
                p={2}
                borderWidth={1}
                borderRadius="md"
                bg={isToday ? 'brand.50' : selectedDate?.toDateString() === date.toDateString() ? 'gray.50' : 'white'}
                borderColor={
                  isToday
                    ? 'brand.500'
                    : selectedDate?.toDateString() === date.toDateString()
                      ? 'brand.300'
                      : 'gray.200'
                }
                cursor="pointer"
                onClick={() => onDateSelect(date)}
                _hover={{
                  borderColor: 'brand.300',
                  bg: 'gray.50'
                }}
              >
                <VStack spacing={1} align="stretch">
                  <Text
                    fontSize="sm"
                    fontWeight={isToday ? 'bold' : 'medium'}
                    color={isToday ? 'brand.500' : 'gray.600'}
                  >
                    {['日', '月', '火', '水', '木', '金', '土'][index]}
                  </Text>
                  <Text
                    fontSize="lg"
                    fontWeight={isToday ? 'bold' : 'normal'}
                    color={isToday ? 'brand.500' : 'gray.800'}
                  >
                    {date.getDate()}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatDuration(dailyTotal)}
                  </Text>
                </VStack>
              </Box>
            );
          })}
        </Grid>
      </VStack>
    </Box>
  );
}