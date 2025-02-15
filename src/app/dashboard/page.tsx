'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Grid,
  SimpleGrid,
  Input,
  Select,
  IconButton,
} from '@chakra-ui/react';
import { TimeIcon } from '@chakra-ui/icons';

interface TimeEntry {
  id: string;
  description: string;
  project: string;
  startTime: Date;
  endTime?: Date;
}

const projectOptions = [
  { value: 'project1', label: 'プロジェクト1' },
  { value: 'project2', label: 'プロジェクト2' },
  { value: 'project3', label: 'プロジェクト3' },
];

export default function Dashboard() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  // タイマーの処理
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (startTime && isTracking) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime, isTracking]);

  useEffect(() => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;

    setCurrentTime(
      `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
  }, [elapsedTime]);

  const startTracking = useCallback(() => {
    if (!description || !selectedProject) {
      alert('プロジェクトと説明を入力してください。');
      return;
    }

    setIsTracking(true);
    setStartTime(new Date());
    setEntries([
      {
        id: Date.now().toString(),
        description,
        project: selectedProject,
        startTime: new Date(),
      },
      ...entries,
    ]);
  }, [description, selectedProject, entries]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setStartTime(null);
    setElapsedTime(0);
    setCurrentTime('00:00:00');
    setDescription('');
    setSelectedProject('');

    const updatedEntries = entries.map((entry, index) => {
      if (index === 0) {
        return {
          ...entry,
          endTime: new Date(),
        };
      }
      return entry;
    });

    setEntries(updatedEntries);
  }, [entries]);

  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={8}>
        <Heading size="lg" mb={4}>ダッシュボード</Heading>
        
        {/* タイマーセクション */}
        <Box
          p={6}
          bg="white"
          borderRadius="lg"
          boxShadow="sm"
          mb={8}
        >
          <Grid
            templateColumns={{ base: '1fr', md: '1fr auto' }}
            gap={4}
            alignItems="center"
          >
            <Box>
              <Text fontSize="sm" color="gray.600" mb={2}>
                現在の作業
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mb={4}>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  disabled={isTracking}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    borderColor: '#E2E8F0',
                    width: '100%',
                  }}
                >
                  <option value="">プロジェクトを選択</option>
                  {projectOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="作業内容を入力"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isTracking}
                />
              </SimpleGrid>
            </Box>
            <Box textAlign="right">
              <Text
                fontSize="4xl"
                fontFamily="monospace"
                mb={2}
              >
                {currentTime}
              </Text>
              <Button
                colorScheme={isTracking ? 'red' : 'brand'}
                onClick={isTracking ? stopTracking : startTracking}
                size="lg"
              >
                <Box as="span" display="inline-flex" alignItems="center">
                  <TimeIcon mr={2} />
                  {isTracking ? '停止' : '開始'}
                </Box>
              </Button>
            </Box>
          </Grid>
        </Box>

        {/* 最近の記録 */}
        <Box>
          <Heading size="md" mb={4}>最近の記録</Heading>
          {entries.length > 0 ? (
            entries.map((entry) => (
              <Box
                key={entry.id}
                p={4}
                bg="white"
                borderRadius="md"
                boxShadow="sm"
                mb={2}
                transition="all 0.2s"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'md',
                }}
              >
                <Grid templateColumns="1fr auto" gap={4}>
                  <Box>
                    <Text fontWeight="bold">{entry.description}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {projectOptions.find(p => p.value === entry.project)?.label}
                    </Text>
                  </Box>
                  <Box textAlign="right">
                    <Text fontSize="sm" color="gray.600">
                      {entry.startTime.toLocaleTimeString()}
                      {entry.endTime
                        ? ` - ${entry.endTime.toLocaleTimeString()}`
                        : ' (進行中)'}
                    </Text>
                  </Box>
                </Grid>
              </Box>
            ))
          ) : (
            <Text color="gray.500" textAlign="center" py={4}>
              記録がありません
            </Text>
          )}
        </Box>
      </Box>
    </Container>
  );
}