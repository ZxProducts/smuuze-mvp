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
  Badge,
  useDisclosure,
  Divider,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { dbOperations, ProjectRow, TaskRow, TimeEntryRow } from '@/lib/supabase';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useToastMessage } from '@/hooks/useToastMessage';
import { ProjectEditModal } from '@/components/ProjectEditModal';
import { TaskList } from '@/components/TaskList';
import { ProjectTimeSummary } from '@/components/ProjectTimeSummary';
import { ProjectCharts } from '@/components/ProjectCharts';
import { ExportMenu } from '@/components/ExportMenu';

interface TimeEntryWithUser extends TimeEntryRow {
  user: {
    id: string;
    full_name: string;
  };
}

interface TaskWithTimeEntries extends TaskRow {
  time_entries: TimeEntryWithUser[];
}

interface TaskWithAssignee extends TaskRow {
  assignee?: {
    id: string;
    full_name: string;
  };
}

interface ProjectWithTasks extends ProjectRow {
  tasks: TaskWithAssignee[];
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { loading, withLoading } = useLoadingState();
  const { showSuccess, showError } = useToastMessage();
  const [project, setProject] = useState<ProjectWithTasks | null>(null);
  const [timeEntryTasks, setTimeEntryTasks] = useState<TaskWithTimeEntries[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeTab, setActiveTab] = useState(0);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadProject();
      loadTimeEntries();
    }
  }, [params.id]);

  const loadProject = async () => {
    await withLoading(async () => {
      try {
        const data = await dbOperations.projects.getById(params.id as string);
        setProject(data as ProjectWithTasks);
      } catch (error) {
        console.error('Error loading project:', error);
        showError('プロジェクトの読み込みに失敗しました');
        router.push('/projects');
      }
    });
  };

  const loadTimeEntries = async () => {
    try {
      const tasks = await dbOperations.projects.getProjectTimeEntries(params.id as string);
      setTimeEntryTasks(tasks.map(task => ({
        ...task,
        description: null,
        priority: 'medium' as TaskRow['priority'],
        assigned_to: null,
        due_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        time_entries: task.time_entries || [],
      })));
    } catch (error) {
      console.error('Error loading time entries:', error);
      showError('作業時間データの読み込みに失敗しました');
    }
  };

  const handleProjectUpdate = async (updates: Partial<ProjectRow>) => {
    if (!project) return;

    await withLoading(async () => {
      try {
        await dbOperations.projects.update(project.id, updates);
        showSuccess('プロジェクトを更新しました');
        loadProject();
      } catch (error) {
        console.error('Error updating project:', error);
        showError('プロジェクトの更新に失敗しました');
      }
    });
  };

  const handleTabChange = async (index: number) => {
    setActiveTab(index);
    // 分析タブが選択された時のデータ読み込み
    if (index === 2) {
      setIsLoadingCharts(true);
      try {
        await loadTimeEntries();
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
          <Text color="gray.600" mt={2}>{project.description || '説明なし'}</Text>
          <Divider mt={4} />
        </Box>

        <Tabs index={activeTab} onChange={handleTabChange}>
          <TabList>
            <Tab>タスク一覧</Tab>
            <Tab>作業時間集計</Tab>
            <Tab>分析</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <TaskList tasks={project.tasks} />
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