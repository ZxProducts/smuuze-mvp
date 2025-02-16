'use client';

import React from 'react';
import {
  Box,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  VStack,
  HStack,
  Text,
  Select,
  Switch,
  useColorModeValue,
  IconButton,
  SimpleGrid,
  Tooltip,
  Spacer,
} from '@chakra-ui/react';
import { SettingsIcon } from '@chakra-ui/icons';
import { useChartStyles } from '@/hooks/useChartStyles';
import { ChartStylePresets } from './ChartStylePresets';

export interface ChartStyles {
  colorScheme: 'default' | 'blues' | 'greens' | 'oranges' | 'purples';
  showLegend: boolean;
  lineStyle: 'straight' | 'curved';
  animations: boolean;
  barStyle: 'grouped' | 'stacked';
}

export const COLOR_SCHEMES = {
  default: {
    colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    name: 'デフォルト',
  },
  blues: {
    colors: ['#2B4ECF', '#3E6FEF', '#5181FF', '#73A5FF', '#96B9FF'],
    name: 'ブルー',
  },
  greens: {
    colors: ['#2E7D32', '#43A047', '#66BB6A', '#81C784', '#A5D6A7'],
    name: 'グリーン',
  },
  oranges: {
    colors: ['#E65100', '#EF6C00', '#F57C00', '#FB8C00', '#FF9800'],
    name: 'オレンジ',
  },
  purples: {
    colors: ['#4A148C', '#6A1B9A', '#7B1FA2', '#8E24AA', '#9C27B0'],
    name: 'パープル',
  },
};

export const defaultChartStyles: ChartStyles = {
  colorScheme: 'default',
  showLegend: true,
  lineStyle: 'curved',
  animations: true,
  barStyle: 'grouped',
};

interface ChartStyleSettingsProps {
  styles: ChartStyles;
  onChange: (styles: ChartStyles) => void;
}

export function getChartColors(scheme: ChartStyles['colorScheme']): string[] {
  return COLOR_SCHEMES[scheme].colors;
}

export function ChartStyleSettings({ styles, onChange }: ChartStyleSettingsProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const {
    presets,
    savePreset,
    updatePreset,
    deletePreset,
    applyPreset,
  } = useChartStyles();

  const handleChange = (key: keyof ChartStyles, value: any) => {
    onChange({
      ...styles,
      [key]: value,
    });
  };

  const handleApplyPreset = (presetId: string) => {
    const newStyles = applyPreset(presetId);
    if (newStyles) {
      onChange(newStyles);
    }
  };

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <IconButton
          aria-label="グラフ設定"
          icon={<SettingsIcon />}
          variant="outline"
          size="sm"
        />
      </PopoverTrigger>
      <PopoverContent
        bg={bgColor}
        borderColor={borderColor}
        width="300px"
      >
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>
          <HStack>
            <Text fontWeight="bold">グラフ設定</Text>
            <Spacer />
            <ChartStylePresets
              currentStyles={styles}
              presets={presets}
              onSave={savePreset}
              onUpdate={updatePreset}
              onDelete={deletePreset}
              onApply={handleApplyPreset}
            />
          </HStack>
        </PopoverHeader>
        <PopoverBody>
          <VStack spacing={4} align="stretch">
            <Box>
              <Text mb={2} fontSize="sm">カラーテーマ</Text>
              <Select
                size="sm"
                value={styles.colorScheme}
                onChange={(e) => handleChange('colorScheme', e.target.value)}
              >
                {Object.entries(COLOR_SCHEMES).map(([key, scheme]) => (
                  <option key={key} value={key}>{scheme.name}</option>
                ))}
              </Select>
            </Box>

            <Box>
              <Text mb={2} fontSize="sm">線グラフのスタイル</Text>
              <Select
                size="sm"
                value={styles.lineStyle}
                onChange={(e) => handleChange('lineStyle', e.target.value)}
              >
                <option value="straight">直線</option>
                <option value="curved">曲線</option>
              </Select>
            </Box>

            <Box>
              <Text mb={2} fontSize="sm">棒グラフのスタイル</Text>
              <Select
                size="sm"
                value={styles.barStyle}
                onChange={(e) => handleChange('barStyle', e.target.value)}
              >
                <option value="grouped">グループ化</option>
                <option value="stacked">積み上げ</option>
              </Select>
            </Box>

            <VStack spacing={2} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm">凡例を表示</Text>
                <Switch
                  isChecked={styles.showLegend}
                  onChange={(e) => handleChange('showLegend', e.target.checked)}
                />
              </HStack>

              <HStack justify="space-between">
                <Text fontSize="sm">アニメーション</Text>
                <Switch
                  isChecked={styles.animations}
                  onChange={(e) => handleChange('animations', e.target.checked)}
                />
              </HStack>
            </VStack>

            <Box>
              <Text mb={2} fontSize="sm">カラーパレット</Text>
              <SimpleGrid columns={5} spacing={2}>
                {COLOR_SCHEMES[styles.colorScheme].colors.map((color, index) => (
                  <Tooltip key={index} label={color}>
                    <Box
                      w="100%"
                      h="24px"
                      bg={color}
                      borderRadius="md"
                      borderWidth={1}
                      borderColor={borderColor}
                    />
                  </Tooltip>
                ))}
              </SimpleGrid>
            </Box>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}