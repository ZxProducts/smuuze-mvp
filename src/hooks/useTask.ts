import { useState } from 'react';
import { useFetch } from './useFetch';
import { supabase } from '@/lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  assigned_to: string | null;
  due_date: string | null;
  project_id: string;
  created_at: string;
}

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

interface UseTaskReturn {
  task: Task | null;
  comments: Comment[];
  loading: boolean;
  error: Error | null;
  loadTask: () => Promise<void>;
  updateTask: (updates: Partial<Omit<Task, 'id' | 'created_at'>>) => Promise<void>;
  updateTaskStatus: (status: Task['status']) => Promise<void>;
  addComment: (content: string) => Promise<void>;
}

export function useTask(taskId: string): UseTaskReturn {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const { loading, error, fetchData, mutateData } = useFetch();

  const loadTask = async () => {
    const taskData = await fetchData(async () => {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
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
        task: taskData as Task,
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

  const updateTask = async (updates: Partial<Omit<Task, 'id' | 'created_at'>>) => {
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
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!updatedTask) throw new Error('タスクが見つかりません');
      return updatedTask as Task;
    }, {
      successMessage: 'タスクを更新しました',
      errorMessage: 'タスクの更新に失敗しました',
    });

    if (result) {
      setTask(result);
    }
  };

  const updateTaskStatus = async (status: Task['status']) => {
    await updateTask({ status });
  };

  const addComment = async (content: string) => {
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
    comments,
    loading,
    error,
    loadTask,
    updateTask,
    updateTaskStatus,
    addComment,
  };
}