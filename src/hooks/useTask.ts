'use client';

import { useState } from 'react';
import { useFetch } from './useFetch';
import { supabase } from '@/lib/supabase/supabase';

import { DatabaseTaskResponse, Profile } from '@/types/database.types';

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    full_name: string;
  };
}

interface TaskAssignee {
  profiles: Profile;
}

interface UseTaskReturn {
  task: DatabaseTaskResponse | null;
  tasks: DatabaseTaskResponse[];
  comments: Comment[];
  loading: boolean;
  isLoading: boolean;
  error: Error | null;
  loadTask: () => Promise<void>;
  updateTask: (updates: Partial<Omit<DatabaseTaskResponse, 'id' | 'created_at'>>) => Promise<void>;
  updateTaskStatus: (status: 'not_started' | 'in_progress' | 'completed') => Promise<void>;
  addComment: (content: string) => Promise<void>;
}

export function useTask(taskId?: string): UseTaskReturn {
  const [task, setTask] = useState<DatabaseTaskResponse | null>(null);
  const [tasks, setTasks] = useState<DatabaseTaskResponse[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const { loading, error, fetchData, mutateData } = useFetch();

  const loadTask = async () => {
    if (!taskId) {
      return;
    }

    const taskData = await fetchData(async () => {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(
            profiles(*)
          ),
          time_entries(
            *,
            user:profiles(
              id,
              full_name
            )
          )
        `)
        .eq('id', taskId)
        .maybeSingle();

      if (taskError) throw taskError;
      if (!taskData) throw new Error('タスクが見つかりません');

      const { data: commentsData } = await supabase
        .from('task_comments')
        .select(`
          *,
          author:profiles(full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      return {
        task: taskData as DatabaseTaskResponse,
        comments: (commentsData || []) as Comment[],
      };
    }, {
      errorMessage: 'タスクの読み込みに失敗しました',
    });

    if (taskData) {
      setTask(taskData.task);
      setComments(taskData.comments);
    }
  };

  const loadTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(
            profiles(*)
          ),
          time_entries(
            *,
            user:profiles(
              id,
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });
  
      if (error) {
        console.error('タスク一覧の取得に失敗しました:', error);
        return;
      }
  
      if (data) {
        // 形式を変換
        const formattedTasks = data.map(task => ({
          ...task,
          assignees: task.assignees?.map((a: TaskAssignee) => a.profiles) || [],
          time_entries: task.time_entries || []
        })) as DatabaseTaskResponse[];
        setTasks(formattedTasks);
      }
};

  const updateTask = async (updates: Partial<Omit<DatabaseTaskResponse, 'id' | 'created_at'>>) => {
    if (!task) return;

    const result = await mutateData(async () => {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // 更新後のタスク全体を取得
      const { data: updatedTask, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(
            profiles(*)
          ),
          time_entries(
            *,
            user:profiles(
              id,
              full_name
            )
          )
        `)
        .eq('id', taskId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!updatedTask) throw new Error('タスクが見つかりません');
      
      const formattedTask = {
        ...updatedTask,
        assignees: updatedTask.assignees?.map((a: TaskAssignee) => a.profiles) || [],
        time_entries: updatedTask.time_entries || []
      } as DatabaseTaskResponse;
      
      return formattedTask;
    }, {
      successMessage: 'タスクを更新しました',
      errorMessage: 'タスクの更新に失敗しました',
    });

    if (result) {
      setTask(result);
    }
  };

  const updateTaskStatus = async (status: 'not_started' | 'in_progress' | 'completed') => {
    await updateTask({ status });
  };

  const addComment = async (content: string) => {
    if (!taskId) return;

    const result = await mutateData(async () => {
      const { data: comment, error } = await supabase
        .from('task_comments')
        .insert([
          {
            task_id: taskId,
            content,
          },
        ])
        .select(`
          *,
          author:profiles(full_name)
        `)
        .maybeSingle();

      if (error) throw error;
      if (!comment) throw new Error('コメントの作成に失敗しました');
      return comment as Comment;
    }, {
      successMessage: 'コメントを追加しました',
      errorMessage: 'コメントの追加に失敗しました',
    });

    if (result) {
      setComments([...comments, result]);
    }
  };

  return {
    task,
    tasks,
    comments,
    loading,
    isLoading: loading,
    error,
    loadTask,
    updateTask,
    updateTaskStatus,
    addComment,
  };
}