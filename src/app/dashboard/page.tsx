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
  useToast,
} from '@chakra-ui/react';
import { TimeIcon } from '@chakra-ui/icons';
import { dbOperations } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeEntry } from '@/contexts/TimeEntryContext';

interface TimeEntry {
  id: string;
  description: string;
  project: string;
  task?: string;
  startTime: Date;
  endTime?: Date;
}

interface ProjectOption {
  value: string;
  label: string;
}

interface TaskOption {
  value: string;
  label: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { activeEntry, startTimer, stopTimer, isLoading: isTimerLoading } = useTimeEntry();
  const toast = useToast();
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('00:00:00');

  // 作業記録の取得
  const fetchTimeEntries = useCallback(async () => {
    if (!user) return;

    try {
      const timeEntriesData = await dbOperations.timeEntries.getUserTimeEntries(user.id);
      
      const mappedEntries = timeEntriesData.map(entry => ({
        id: entry.id,
        description: entry.description || '',
        project: entry.project_id,
        task: entry.task_id,
        startTime: new Date(entry.start_time),
        endTime: entry.end_time ? new Date(entry.end_time) : undefined,
      }));

      setEntries(mappedEntries);
    } catch (error) {
      console.error('作業記録の取得に失敗しました:', error);
      toast({
        title: 'エラー',
        description: '作業記録の取得に失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [user, toast]);

  // プロジェクト一覧の取得
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projects = await dbOperations.projects.list();
        const options = projects.map(project => ({
          value: project.id,
          label: project.name
        }));
        setProjectOptions(options);
      } catch (error) {
        console.error('プロジェクト一覧の取得に失敗しました:', error);
        toast({
          title: 'エラー',
          description: 'プロジェクト一覧の取得に失敗しました',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchProjects();
  }, [toast]);

  // プロジェクト選択時にタスク一覧を取得
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedProject) {
        setTaskOptions([]);
        return;
      }

      try {
        const projectData = await dbOperations.projects.getById(selectedProject);
        const tasks = projectData.tasks || [];
        const options = tasks.map(task => ({
          value: task.id,
          label: task.title
        }));
        setTaskOptions(options);
      } catch (error) {
        console.error('タスク一覧の取得に失敗しました:', error);
        toast({
          title: 'エラー',
          description: 'タスク一覧の取得に失敗しました',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchTasks();
  }, [selectedProject, toast]);

  // 経過時間の表示
  useEffect(() => {
    if (activeEntry) {
      const interval = setInterval(() => {
        const now = new Date();
        const start = new Date(activeEntry.start_time);
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);

        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;

        setCurrentTime(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCurrentTime('00:00:00');
    }
  }, [activeEntry]);

  // 初期データの読み込み
  useEffect(() => {
    const initializeData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // プロジェクト一覧を取得
        const projects = await dbOperations.projects.list();
        const projectOpts = projects.map(project => ({
          value: project.id,
          label: project.name
        }));
        setProjectOptions(projectOpts);

        // アクティブなエントリーが存在する場合はフォームを設定
        if (activeEntry) {
          setSelectedProject(activeEntry.project_id);
          setSelectedTask(activeEntry.task_id || '');
          setDescription(activeEntry.description || '');
          setCurrentTaskId(activeEntry.task_id);

          // プロジェクトに紐づくタスク一覧を取得
          const projectData = await dbOperations.projects.getById(activeEntry.project_id);
          const tasks = projectData.tasks || [];
          const taskOpts = tasks.map(task => ({
            value: task.id,
            label: task.title
          }));
          setTaskOptions(taskOpts);
        }

        // 作業記録を取得
        await fetchTimeEntries();
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [user, activeEntry, fetchTimeEntries, toast]);

  // 作業開始
  const handleStartTracking = useCallback(async () => {
    if (!selectedProject || !selectedTask || !user) {
      toast({
        title: '入力エラー',
        description: 'プロジェクトとタスクを選択してください',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      await startTimer(selectedProject, selectedTask);
      await fetchTimeEntries();
    } catch (error) {
      console.error('作業記録の開始に失敗しました:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '作業記録の開始に失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [selectedProject, selectedTask, user, startTimer, fetchTimeEntries, toast]);

  // 作業停止
  const handleStopTracking = useCallback(async () => {
    try {
      await stopTimer();
      await fetchTimeEntries();
      
      // フォームをリセット
      setDescription('');
      setSelectedProject('');
      setSelectedTask('');
      setCurrentTaskId(null);
    } catch (error) {
      console.error('作業記録の停止に失敗しました:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '作業記録の停止に失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [stopTimer, fetchTimeEntries, toast]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProject(e.target.value);
    setSelectedTask(''); // プロジェクトが変更されたらタスクの選択をリセット
  };

  if (!user) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>ログインが必要です</Text>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>読み込み中...</Text>
      </Container>
    );
  }

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
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={4}>
                <Select
                  value={selectedProject}
                  onChange={handleProjectChange}
                  disabled={!!activeEntry}
                  placeholder="プロジェクトを選択"
                  isRequired
                >
                  {projectOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  disabled={!!activeEntry || !selectedProject}
                  placeholder="タスクを選択"
                  isRequired
                >
                  {taskOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="作業内容を入力（任意）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!!activeEntry}
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
                colorScheme={activeEntry ? 'red' : 'brand'}
                onClick={activeEntry ? handleStopTracking : handleStartTracking}
                size="lg"
                isLoading={isTimerLoading}
                isDisabled={!activeEntry && (!selectedProject || !selectedTask)}
              >
                <Box as="span" display="inline-flex" alignItems="center">
                  <TimeIcon mr={2} />
                  {activeEntry ? '停止' : '開始'}
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
                      {entry.task && taskOptions.find(t => t.value === entry.task) && (
                        ` - ${taskOptions.find(t => t.value === entry.task)?.label}`
                      )}
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