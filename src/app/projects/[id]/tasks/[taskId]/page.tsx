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
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/supabase';
import { AuthGuard } from '@/components/AuthGuard';
import { TaskEditModal } from '@/components/TaskEditModal';
import { TimeEntryList } from '@/components/TimeEntryList';
import { useTimeEntry } from '@/contexts/TimeEntryContext';
import { TimeIcon } from '@chakra-ui/icons';
import { apiClient } from '@/lib/api-client';
import {
  TaskDetail,
  TeamMemberWithProfile,
  TimeEntryWithDetails,
  DatabaseTimeEntry,
  DatabaseTaskResponse,
  DatabaseTeamMemberResponse,
  Profile,
  Project,
  TaskCommentWithAuthor,
  TaskHistory,
} from '@/types/database.types';

interface TaskDetailPageProps {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
}

type Params = {
  id: string;
  taskId: string;
};

interface DatabaseTaskWithRelations extends DatabaseTaskResponse {
  time_entries: DatabaseTimeEntry[];
}

interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  comment: string;
  created_at: string;
  author: {
    id: string;
    full_name: string;
  };
}

// タイマー制御コンポーネント
const TimerControl: React.FC<{ task: TaskDetail }> = ({ task }) => {
  const { activeEntry, startTimer, stopTimer, isLoading } = useTimeEntry();
  const isCurrentTaskActive = activeEntry?.task_id === task.id;
  const isOtherTaskActive = activeEntry && !isCurrentTaskActive;

  return (
    <Button
      leftIcon={<TimeIcon />}
      colorScheme={isCurrentTaskActive ? "red" : "brand"}
      onClick={() => isCurrentTaskActive ? stopTimer() : startTimer(task.project_id, task.id)}
      isLoading={isLoading}
      isDisabled={isOtherTaskActive || undefined}
    >
      {isCurrentTaskActive ? "作業を終了" : "作業を開始"}
    </Button>
  );
};

export default function TaskDetailPage({ params: paramsPromise }: TaskDetailPageProps) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithDetails[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const params = React.use(paramsPromise) as Params;

  // 週の開始日と終了日を取得
  const getWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  };

  // 作業記録を取得
  const fetchTimeEntries = useCallback(async (targetDate: Date = currentDate) => {
    if (!task) return;

    const { startOfWeek, endOfWeek } = getWeekRange(targetDate);

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user:profiles(id, full_name, email)
        `)
        .eq('task_id', task.id)
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;
      setTimeEntries(data as TimeEntryWithDetails[]);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast({
        title: '作業記録の取得に失敗しました',
        status: 'error',
        duration: 3000,
      });
    }
  }, [task, currentDate, toast]);

  const fetchTaskDetails = useCallback(async () => {
    try {
      // タスクの詳細と担当者情報を取得
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:project_id (
            id,
            name,
            description
          ),
          task_assignees (
            user_id,
            profiles:user_id (
              id,
              full_name,
              email
            )
          ),
          comments:task_comments (
            id,
            task_id,
            author_id,
            comment,
            created_at,
            author:author_id (
              id,
              full_name
            )
          ),
          history:task_history (
            id,
            task_id,
            changed_by,
            change_type,
            old_value,
            new_value,
            changed_at,
            author:changed_by (
              id,
              full_name
            )
          )
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
          profiles!user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('team_id', taskData.team_id);

      if (membersError) throw membersError;

      // チームメンバーデータを変換
      const formattedMembers: TeamMemberWithProfile[] = [];
      (membersData as Array<DatabaseTeamMemberResponse & { profiles: any }>).forEach(member => {
        if (member && member.profiles) {
          const profileData = member.profiles;
          const profile: Profile = {
            id: profileData.id || '',
            full_name: profileData.full_name || '',
            email: profileData.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          formattedMembers.push({
            id: member.id,
            team_id: member.team_id,
            user_id: member.user_id,
            role: member.role,
            hourly_rate: 0,
            daily_work_hours: 8,
            weekly_work_days: 5,
            meeting_included: true,
            notes: null,
            joined_at: new Date().toISOString(),
            profile
          });
        }
      });

      // タスクデータを変換
      const formattedTaskDetail: TaskDetail = {
        ...taskData,
        assignees: taskData.task_assignees?.map((ta: any) => ({
          id: ta.profiles.id,
          full_name: ta.profiles.full_name,
          email: ta.profiles.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })) || [],
        project: {
          id: taskData.project?.id || '',
          name: taskData.project?.name || '',
          description: taskData.project?.description || null,
          team_id: taskData.team_id,
          created_by: taskData.team_id,
          start_date: null,
          end_date: null,
          created_at: taskData.created_at,
          updated_at: taskData.updated_at
        },
        time_entries: [], // 空の配列を設定（timeEntriesステートで管理）
        comments: (taskData.comments || []).map((comment: TaskComment) => ({
          id: comment.id,
          task_id: comment.task_id,
          author_id: comment.author_id,
          content: comment.comment,
          created_at: comment.created_at,
          updated_at: comment.created_at,
          author: comment.author
        })),
        history: (taskData.history || []).map((history: DatabaseTaskResponse['history'][0]): TaskHistory => ({
          id: history.id,
          task_id: history.task_id,
          changed_by: history.changed_by,
          change_type: history.change_type,
          old_value: history.old_value,
          new_value: history.new_value,
          changed_at: history.changed_at,
          author: history.author
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

  useEffect(() => {
    if (task) {
      fetchTimeEntries(currentDate);
    }
  }, [currentDate, task, fetchTimeEntries]);

  const handleTaskUpdate = async (updates: Partial<TaskDetail>, assigneeIds: string[]) => {
    try {
      // タスクの基本情報を更新
      const { error: taskError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', params.taskId);

      if (taskError) throw taskError;

      // 担当者を更新（新しいAPIエンドポイントを使用）
      const { error } = await apiClient.tasks.updateAssignees(params.taskId, {
        assigneeIds
      });

      if (error) throw error;

      // 状態を更新（再取得）
      await fetchTaskDetails();

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
            <HStack spacing={2}>
              <TimerControl task={task} />
              <Button onClick={onOpen}>編集</Button>
            </HStack>
          </HStack>

          <Box>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="bold" mb={2}>担当者:</Text>
                <Wrap>
                  {task.assignees.map(assignee => (
                    <WrapItem key={assignee.id}>
                      <Badge colorScheme="blue">
                        {assignee.full_name}
                      </Badge>
                    </WrapItem>
                  ))}
                  {task.assignees.length === 0 && (
                    <WrapItem>
                      <Badge colorScheme="gray">未割り当て</Badge>
                    </WrapItem>
                  )}
                </Wrap>
              </Box>
              {task.due_date && (
                <Badge alignSelf="flex-start">
                  期限: {new Date(task.due_date).toLocaleDateString()}
                </Badge>
              )}
              <Text whiteSpace="pre-wrap">{task.description}</Text>
            </VStack>
          </Box>

          <Divider />

          <Box>
            <Heading size="md" mb={4}>作業時間記録</Heading>
            <TimeEntryList
              entries={timeEntries}
              taskId={task.id}
              projectId={task.project_id}
              onEntryChange={() => {
                fetchTaskDetails();
                fetchTimeEntries(currentDate);
              }}
            />
          </Box>
        </VStack>

        <TaskEditModal
          isOpen={isOpen}
          onClose={onClose}
          task={task}
          projectId={params.id}
          teamMembers={teamMembers}
          onUpdate={handleTaskUpdate}
        />
      </Container>
    </AuthGuard>
  );
}