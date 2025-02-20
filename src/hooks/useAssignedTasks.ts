import { useEffect, useState } from 'react';
import { Task, Profile } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface AssignedTask extends Task {
  project: {
    name: string;
  };
  time_entries: {
    id: string;
    end_time: string | null;
  }[];
}

export function useAssignedTasks() {
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchAssignedTasks = async () => {
      try {
        const { data: assignedTasks, error } = await supabase
          .from('tasks')
          .select(`
            *,
            project:project_id (
              name
            ),
            time_entries (
              id,
              end_time
            )
          `)
          .in(
            'id',
            await supabase
              .from('task_assignees')
              .select('task_id')
              .eq('user_id', user.id)
              .then(({ data }) => {
                if (!data || data.length === 0) {
                  setTasks([]);
                  return ['-1']; // 存在しないIDを指定して空の結果を取得
                }
                return data.map(a => a.task_id);
              })
          );

        if (error) throw error;

        setTasks(assignedTasks as AssignedTask[]);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedTasks();
  }, [user]);

  return { tasks, loading, error };
}