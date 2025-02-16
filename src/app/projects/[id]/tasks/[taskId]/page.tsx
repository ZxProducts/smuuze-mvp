'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  HStack,
  Badge,
  Divider,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/AuthGuard';
import { TaskEditModal } from '@/components/TaskEditModal';
import { TimeEntryList } from '@/components/TimeEntryList';
import {
  TaskDetail,
  TeamMemberWithProfile,
  TimeEntryWithUser,
  DatabaseTimeEntry,
  DatabaseTaskResponse,
  DatabaseTeamMemberResponse,
  Profile,
  Project,
  TaskStatus,
  TaskPriority,
} from '@/types/database.types';

interface TaskDetailPageProps {
  params: {
    id: string;
    taskId: string;
  };
}

interface DatabaseTaskWithRelations extends DatabaseTaskResponse {
  time_entries: DatabaseTimeEntry[];
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTaskDetails = useCallback(async () => {
    try {
      // タスクの詳細を取得
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:project_id (*),
          assignee:assignee_id (
            id,
            full_name,
            email,
            avatar_url
          ),
          time_entries (
            *,
            user:user_id (
              id,
              full_name
            )
          ),
          comments:task_comments (
            *,
            author:user_id (
              id,
              full_name
            )
          ),
          history:task_history (*)
        `)
        .eq('id', params.taskId)
        .single();

      if (taskError) throw taskError;

      // チームメンバーを取得
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          user_id,
          role,
          created_at,
          updated_at,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('team_id', taskData.team_id);

      if (membersError) throw membersError;

      // データを適切な型に変換
      const typedTaskData = taskData as DatabaseTaskResponse;

      // チームメンバーデータを変換
      const formattedMembers: TeamMemberWithProfile[] = (membersData || [])
        .filter((member): member is (typeof membersData)[0] & { profiles: Profile } =>
          Boolean(member && member.profiles)
        )
        .map(member => ({
          id: member.id,
          team_id: member.team_id,
          user_id: member.user_id,
          role: member.role,
          created_at: member.created_at,
          updated_at: member.updated_at,
          profile: member.profiles
        }));

      // タスクデータを変換
      const formattedTaskDetail: TaskDetail = {
        id: typedTaskData.id,
        title: typedTaskData.title,
        description: typedTaskData.description,
        status: typedTaskData.status as TaskStatus,
        priority: typedTaskData.priority as TaskPriority,
        project_id: typedTaskData.project_id,
        team_id: typedTaskData.team_id,
        assignee_id: typedTaskData.assignee_id,
        due_date: typedTaskData.due_date,
        created_at: typedTaskData.created_at,
        updated_at: typedTaskData.updated_at,
        project: {
          id: typedTaskData.project?.id || '',
          name: typedTaskData.project?.name || '',
          description: typedTaskData.project?.description || null,
          team_id: typedTaskData.team_id,
          owner_id: '',
          start_date: null,
          end_date: null,
          created_at: typedTaskData.created_at,
          updated_at: typedTaskData.updated_at
        },
        assignee: typedTaskData.assignee,
        time_entries: typedTaskData.time_entries.map(entry => ({
          ...entry,
          user: entry.user
        })) as TimeEntryWithUser[],
        comments: (typedTaskData.comments || []).map(comment => ({
          id: comment.id,
          task_id: comment.task_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          updated_at: comment.created_at,
          author: comment.author
        })),
        history: (typedTaskData.history || []).map(history => ({
          id: history.id,
          task_id: history.task_id,
          user_id: history.user_id,
          change_type: history.change_type,
          previous_value: history.previous_value,
          new_value: history.new_value,
          created_at: history.created_at
        }))
      };

      setTask(formattedTaskDetail);
      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching task details:', error);
      toast({
        title: 'タスクの取得に失敗しました',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [params.taskId, toast]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  const handleTaskUpdate = async (updates: Partial<TaskDetail>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', params.taskId);

      if (error) throw error;

      // 状態を更新
      setTask(prev => prev ? { ...prev, ...updates } : null);

      toast({
        title: 'タスクを更新しました',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'タスクの更新に失敗しました',
        status: 'error',
        duration: 3000,
      });
      throw error;
    }
  };

  if (isLoading || !task) {
    return (
      <AuthGuard>
        <Container maxW="container.lg" py={8}>
          <Text>Loading...</Text>
        </Container>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Container maxW="container.lg" py={8}>
        <VStack spacing={8} align="stretch">
          <HStack justify="space-between">
            <Box>
              <Heading size="lg">{task.title}</Heading>
              <Text color="gray.500" fontSize="sm">
                プロジェクト: {task.project?.name}
              </Text>
            </Box>
            <Button onClick={onOpen}>編集</Button>
          </HStack>

          <Box>
            <HStack spacing={4} mb={4}>
              <Badge
                colorScheme={
                  task.status === 'completed'
                    ? 'green'
                    : task.status === 'in_progress'
                    ? 'blue'
                    : 'gray'
                }
              >
                {task.status === 'completed'
                  ? '完了'
                  : task.status === 'in_progress'
                  ? '進行中'
                  : '未着手'}
              </Badge>
              <Badge
                colorScheme={
                  task.priority === 'high'
                    ? 'red'
                    : task.priority === 'medium'
                    ? 'yellow'
                    : 'gray'
                }
              >
                優先度: {
                  task.priority === 'high'
                    ? '高'
                    : task.priority === 'medium'
                    ? '中'
                    : '低'
                }
              </Badge>
              {task.due_date && (
                <Badge>期限: {new Date(task.due_date).toLocaleDateString()}</Badge>
              )}
            </HStack>
            <Text>{task.description}</Text>
          </Box>

          <Divider />

          <Box>
            <Heading size="md" mb={4}>作業時間記録</Heading>
            <TimeEntryList
              entries={task.time_entries as TimeEntryWithUser[]}
              taskId={task.id}
              projectId={task.project_id}
              onEntryChange={fetchTaskDetails}
            />
          </Box>
        </VStack>

        <TaskEditModal
          isOpen={isOpen}
          onClose={onClose}
          task={task}
          projectId={params.id}
          teamMembers={teamMembers}
          onSave={handleTaskUpdate}
        />
      </Container>
    </AuthGuard>
  );
}