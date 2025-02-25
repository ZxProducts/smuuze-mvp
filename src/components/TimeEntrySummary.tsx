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
} from '@chakra-ui/react';
import { TimeEntryRow } from '@/lib/supabase/supabase';

interface TimeEntryWithUser extends TimeEntryRow {
  user: {
    id: string;
    full_name: string;
  };
}

interface TimeEntrySummaryProps {
  entries: TimeEntryWithUser[];
}

interface UserSummary {
  user_id: string;
  full_name: string;
  total_minutes: number;
  entry_count: number;
}

export function TimeEntrySummary({ entries }: TimeEntrySummaryProps) {
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

  const calculateTotalTime = (): number => {
    return entries.reduce((total, entry) => {
      return total + calculateDuration(entry.start_time, entry.end_time);
    }, 0);
  };

  const calculateUserSummaries = (): UserSummary[] => {
    const summaries = new Map<string, UserSummary>();

    entries.forEach(entry => {
      const existing = summaries.get(entry.user.id) || {
        user_id: entry.user.id,
        full_name: entry.user.full_name,
        total_minutes: 0,
        entry_count: 0,
      };

      existing.total_minutes += calculateDuration(entry.start_time, entry.end_time);
      existing.entry_count++;
      summaries.set(entry.user.id, existing);
    });

    return Array.from(summaries.values()).sort((a, b) => b.total_minutes - a.total_minutes);
  };

  const totalMinutes = calculateTotalTime();
  const userSummaries = calculateUserSummaries();
  const averageMinutesPerEntry = entries.length > 0 ? totalMinutes / entries.length : 0;

  return (
    <Box>
      <Grid
        templateColumns="repeat(3, 1fr)"
        gap={4}
        mb={6}
      >
        <GridItem>
          <Stat>
            <StatLabel>総作業時間</StatLabel>
            <StatNumber>{getTimeString(totalMinutes)}</StatNumber>
            <StatHelpText>全メンバーの合計</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat>
            <StatLabel>作業記録数</StatLabel>
            <StatNumber>{entries.length}</StatNumber>
            <StatHelpText>記録の総数</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat>
            <StatLabel>平均作業時間</StatLabel>
            <StatNumber>{getTimeString(Math.floor(averageMinutesPerEntry))}</StatNumber>
            <StatHelpText>1回あたり</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      {userSummaries.length > 0 && (
        <Box>
          <Text fontWeight="bold" mb={3}>メンバー別作業時間</Text>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            {userSummaries.map((summary) => (
              <GridItem key={summary.user_id}>
                <Box p={3} bg="gray.50" borderRadius="md">
                  <Tooltip
                    label={`${summary.entry_count}回の作業記録`}
                    placement="top"
                  >
                    <Text fontWeight="medium" mb={1}>
                      {summary.full_name}
                    </Text>
                  </Tooltip>
                  <Text color="gray.600">
                    {getTimeString(summary.total_minutes)}
                  </Text>
                </Box>
              </GridItem>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}