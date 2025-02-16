'use client';

import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Grid,
  Badge,
  Progress,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectRow, dbOperations, TaskStatistics } from '@/lib/supabase';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useToastMessage } from '@/hooks/useToastMessage';

interface ProjectWithStats extends ProjectRow {
  taskStats: TaskStatistics;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { loading, withLoading } = useLoadingState();
  const { showError } = useToastMessage();
  const [projects, setProjects] = React.useState<ProjectWithStats[]>([]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    await withLoading(async () => {
      try {
        // プロジェクト一覧を取得
        const projectsData = await dbOperations.projects.list();

        // プロジェクトごとのタスク統計を取得
        const projectsWithStats = await Promise.all(
          projectsData.map(async (project) => {
            const stats = await dbOperations.tasks.getProjectStats(project.id);
            return {
              ...project,
              taskStats: stats,
            };
          })
        );

        setProjects(projectsWithStats);
      } catch (error) {
        showError('プロジェクトの読み込みに失敗しました');
        console.error('Error loading projects:', error);
      }
    });
  };

  const calculateProgress = (stats: TaskStatistics) => {
    if (stats.total === 0) return 0;
    return (stats.completed / stats.total) * 100;
  };

  const getStatusBadgeColor = (value: number, total: number) => {
    if (total === 0) return 'gray';
    const percentage = (value / total) * 100;
    if (percentage >= 80) return 'green';
    if (percentage >= 40) return 'yellow';
    return 'red';
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Box>
          <Heading size="lg">プロジェクト</Heading>
          <Text color="gray.600">
            進行中のプロジェクト: {projects.length}件
          </Text>
        </Box>
        <Button
          colorScheme="brand"
          onClick={() => router.push('/projects/new')}
        >
          <AddIcon mr={2} />
          新規プロジェクト
        </Button>
      </Box>

      {projects.length > 0 ? (
        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
          gap={6}
        >
          {projects.map((project) => (
            <Box
              key={project.id}
              bg="white"
              p={6}
              borderRadius="lg"
              boxShadow="sm"
              onClick={() => router.push(`/projects/${project.id}`)}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'md',
              }}
            >
              <Heading size="md" mb={2}>{project.name}</Heading>
              <Text
                color="gray.600"
                mb={4}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  maxHeight: '2.4em',
                  lineHeight: '1.2',
                }}
              >
                {project.description || '説明なし'}
              </Text>

              <Box mb={4}>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Text fontSize="sm" color="gray.600">
                    進捗状況
                  </Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {Math.round(calculateProgress(project.taskStats))}%
                  </Text>
                </Box>
                <Progress
                  value={calculateProgress(project.taskStats)}
                  size="sm"
                  colorScheme={getStatusBadgeColor(
                    project.taskStats.completed,
                    project.taskStats.total
                  )}
                  borderRadius="full"
                />
              </Box>

              <Box display="flex" gap={2} flexWrap="wrap">
                <Badge colorScheme="green">
                  完了: {project.taskStats.completed}
                </Badge>
                <Badge colorScheme="blue">
                  進行中: {project.taskStats.in_progress}
                </Badge>
                <Badge colorScheme="gray">
                  未着手: {project.taskStats.not_started}
                </Badge>
              </Box>
            </Box>
          ))}
        </Grid>
      ) : (
        <Box
          bg="white"
          p={8}
          borderRadius="lg"
          textAlign="center"
        >
          {loading ? (
            <Text>読み込み中...</Text>
          ) : (
            <>
              <Text color="gray.600" mb={4}>
                プロジェクトがありません
              </Text>
              <Button
                colorScheme="brand"
                onClick={() => router.push('/projects/new')}
              >
                <AddIcon mr={2} />
                最初のプロジェクトを作成
              </Button>
            </>
          )}
        </Box>
      )}
    </Container>
  );
}