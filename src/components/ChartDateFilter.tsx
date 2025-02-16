'use client';

import React from 'react';
import {
  HStack,
  Select,
  FormControl,
  FormLabel,
  Input,
  Button,
  Box,
  useBreakpointValue,
} from '@chakra-ui/react';

export type DateRange = {
  start: string | null;
  end: string | null;
};

export type PresetRange = '7days' | '30days' | '90days' | 'all' | 'custom';

interface ChartDateFilterProps {
  range: DateRange;
  preset: PresetRange;
  onRangeChange: (range: DateRange) => void;
  onPresetChange: (preset: PresetRange) => void;
  isDisabled?: boolean;
}

export function ChartDateFilter({
  range,
  preset,
  onRangeChange,
  onPresetChange,
  isDisabled = false,
}: ChartDateFilterProps) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  const handlePresetChange = (newPreset: PresetRange) => {
    onPresetChange(newPreset);

    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = new Date();

    switch (newPreset) {
      case '7days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        start = null;
        end = null;
        break;
      case 'custom':
        // カスタム選択時は現在の範囲を維持
        return;
    }

    onRangeChange({
      start: start?.toISOString().split('T')[0] || null,
      end: end?.toISOString().split('T')[0] || null,
    });
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    onPresetChange('custom');
    onRangeChange({
      ...range,
      [field]: value || null,
    });
  };

  return (
    <Box mb={4}>
      <HStack
        spacing={4}
        direction={isMobile ? 'column' : 'row'}
        align={isMobile ? 'stretch' : 'flex-end'}
      >
        <FormControl>
          <FormLabel>期間</FormLabel>
          <Select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as PresetRange)}
            isDisabled={isDisabled}
          >
            <option value="7days">過去7日間</option>
            <option value="30days">過去30日間</option>
            <option value="90days">過去90日間</option>
            <option value="all">全期間</option>
            <option value="custom">カスタム</option>
          </Select>
        </FormControl>

        {preset === 'custom' && (
          <>
            <FormControl>
              <FormLabel>開始日</FormLabel>
              <Input
                type="date"
                value={range.start || ''}
                onChange={(e) => handleDateChange('start', e.target.value)}
                isDisabled={isDisabled}
              />
            </FormControl>

            <FormControl>
              <FormLabel>終了日</FormLabel>
              <Input
                type="date"
                value={range.end || ''}
                onChange={(e) => handleDateChange('end', e.target.value)}
                isDisabled={isDisabled}
                min={range.start || undefined}
              />
            </FormControl>
          </>
        )}
      </HStack>
    </Box>
  );
}