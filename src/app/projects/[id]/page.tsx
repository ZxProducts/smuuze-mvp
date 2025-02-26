'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Button,
  Text,
  VStack,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
  Divider,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Task, Project, Profile } from '@/types/database.types';
import { ProjectDetailResponse } from '@/types/api';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useToastMessage } from '@/hooks/useToastMessage';
import { useFetch } from '@/hooks/useFetch';
import { ProjectEditModal } from '@/components/ProjectEditModal';
import { TaskList } from '@/components/TaskList';
import { ProjectTimeSummary } from '@/components/ProjectTimeSummary';
import { ProjectCharts } from '@/components/ProjectCharts';
import { ExportMenu } from '@/components/ExportMenu';

// タスク一覧用の型定義
interface TaskWithAssignee {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
  team_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    full_name: string;
  };
}

// 作業時間エントリー型
interface TimeEntryWithUser {
  id: string;
  task_id: string | null;
  project_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
  };
  task?: {
    id: string;
    title: string;
  } | null;
}

// 作業時間付きタスク型（グラフ用）
interface TaskForAnalytics extends Task {
  status: 'not_started' | 'in_progress' | 'completed';
  time_entries: TimeEntryWithUser[];
  assignees: Profile[];
}

// タスクデータを変換するヘルパー関数
const convertToTaskWithAssignee = (task: ProjectDetailResponse['tasks'][0]): TaskWithAssignee => {
  return {
    ...task,
    status: task.status || 'not_started',
    assignee: task.assignees[0] ? {
      id: task.assignees[0].id,
      full_name: task.assignees[0].full_name,
    } : undefined,
  };
};

// 作業時間付きタスクに変換するヘルパー関数
const convertToTaskWithTimeEntries = (
  task: ProjectDetailResponse['tasks'][0],
  timeEntries: TimeEntryWithUser[]
): TaskForAnalytics => {
  return {
    ...task,
    status: task.status || 'not_started',
    time_entries: timeEntries,
  };
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const searchParams = useParams();
  const { id } = searchParams;
  const projectId = id as string;
  const { loading, withLoading } = useLoadingState();
  const { showSuccess, showError } = useToastMessage();
  const { fetchData } = useFetch();
  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [timeEntryTasks, setTimeEntryTasks] = useState<TaskForAnalytics[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeTab, setActiveTab] = useState(0);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    await withLoading(async () => {
      try {
        const response = await fetchData<{ data: ProjectDetailResponse }>(
          async () => {
            const res = await fetch(`/api/projects/${projectId}`);
            if (!res.ok) {
              throw new Error('プロジェクトの取得に失敗しました');
            }
            return res.json();
          },
          {
            errorMessage: 'プロジェクトの読み込みに失敗しました'
          }
        );

        if (response) {
          setProject(response.data);

          // 作業時間のあるタスクの設定
          const timeEntriesMap = new Map<string, TimeEntryWithUser[]>();
          
          response.data.timeEntries.forEach(entry => {
            if (!entry.task_id || !entry.user) return;
            
            const taskEntries = timeEntriesMap.get(entry.task_id) || [];
            const timeEntryWithUser: TimeEntryWithUser = {
              ...entry,
              user_id: entry.user.id,
              project_id: response.data.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user: entry.user,
            };
            taskEntries.push(timeEntryWithUser);
            timeEntriesMap.set(entry.task_id, taskEntries);
          });

          const tasksWithTimeEntries = response.data.tasks.map(task => 
            convertToTaskWithTimeEntries(task, timeEntriesMap.get(task.id) || [])
          );

          setTimeEntryTasks(tasksWithTimeEntries);
        }
      } catch (error) {
        console.error('Error loading project:', error);
        showError('プロジェクトの読み込みに失敗しました');
        router.push('/projects');
      }
    });
  };

  const handleProjectUpdate = async (updates: Partial<Project>) => {
    if (!project) return;

    await withLoading(async () => {
      try {
        const response = await fetchData<{ data: ProjectDetailResponse }>(
          async () => {
            const res = await fetch(`/api/projects/${project.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updates),
            });
            if (!res.ok) {
              throw new Error('プロジェクトの更新に失敗しました');
            }
            return res.json();
          },
          {
            errorMessage: 'プロジェクトの更新に失敗しました',
            successMessage: 'プロジェクトを更新しました'
          }
        );

        if (response) {
          setProject(response.data);
        }
      } catch (error) {
        console.error('Error updating project:', error);
        showError('プロジェクトの更新に失敗しました');
      }
    });
  };

  const handleTabChange = async (index: number) => {
    setActiveTab(index);
    // 分析タブが選択された時のデータ更新
    if (index === 2) {
      setIsLoadingCharts(true);
      try {
        await loadProject();
      } finally {
        setIsLoadingCharts(false);
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!project) {
    return (
      <Container maxW="container.lg" py={8}>
        <Text>読み込み中...</Text>
      </Container>
    );
  }

  const taskList = project.tasks.map(convertToTaskWithAssignee);

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <HStack justify="space-between" mb={4}>
            <Box>
              <Heading size="lg" mb={2}>{project.name}</Heading>
              <HStack spacing={4}>
                {project.start_date && (
                  <Text color="gray.600">
                    開始: {formatDate(project.start_date)}
                  </Text>
                )}
                {project.end_date && (
                  <Text color="gray.600">
                    終了予定: {formatDate(project.end_date)}
                  </Text>
                )}
              </HStack>
            </Box>
            <HStack spacing={2}>
              <ExportMenu
                projectName={project.name}
                tasks={timeEntryTasks}
                isDisabled={loading}
              />
              <Button
                leftIcon={<EditIcon />}
                variant="outline"
                onClick={onOpen}
              >
                プロジェクトを編集
              </Button>
              <Button
                as={Link}
                href={`/projects/${project.id}/tasks/new`}
                leftIcon={<AddIcon />}
                colorScheme="brand"
              >
                タスクを作成
              </Button>
            </HStack>
          </HStack>
          <Text color="gray.600" mt={2} mb={4}>{project.description || '説明なし'}</Text>
          <Divider />
        </Box>

        <Tabs index={activeTab} onChange={handleTabChange}>
          <TabList>
            <Tab>タスク一覧</Tab>
            <Tab>作業時間集計</Tab>
            <Tab>分析</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <TaskList tasks={taskList} />
            </TabPanel>

            <TabPanel px={0}>
              <ProjectTimeSummary tasks={timeEntryTasks} />
            </TabPanel>

            <TabPanel px={0}>
              {isLoadingCharts ? (
                <Center py={8}>
                  <Spinner size="xl" color="brand.500" thickness="4px" />
                </Center>
              ) : (
                <ProjectCharts tasks={timeEntryTasks} />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

        <ProjectEditModal
          project={project}
          isOpen={isOpen}
          onClose={onClose}
          onSave={handleProjectUpdate}
        />
      </VStack>
    </Container>
  );
}