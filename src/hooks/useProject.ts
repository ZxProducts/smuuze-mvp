'use client';

import { useState } from 'react';
import { useFetch } from './useFetch';
import { supabase } from '@/lib/supabase/supabase';

interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  team_id: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  assigned_to: string | null;
  due_date: string | null;
}

interface TaskStatus {
  status: Task['status'];
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

interface TaskStatistics {
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
}

interface UseProjectReturn {
  project: Project | null;
  tasks: Task[];
  members: TeamMember[];
  taskStats: TaskStatistics;
  loading: boolean;
  error: Error | null;
  loadProject: () => Promise<void>;
  updateProject: (updates: Partial<Omit<Project, 'id' | 'created_at'>>) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'project_id'>) => Promise<void>;
  loadTaskStatistics: () => Promise<void>;
}

const defaultTaskStats: TaskStatistics = {
  total: 0,
  completed: 0,
  in_progress: 0,
  not_started: 0,
};

export function useProject(projectId: string): UseProjectReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStatistics>(defaultTaskStats);

  const { loading, error, fetchData, mutateData } = useFetch();

  const calculateTaskStatistics = (statusList: TaskStatus[]) => {
    const stats = statusList.reduce(
      (acc, { status }) => {
        acc.total++;
        acc[status]++;
        return acc;
      },
      { ...defaultTaskStats }
    );

    setTaskStats(stats);
  };

  const loadProject = async () => {
    const data = await fetchData(async () => {
      // プロジェクト詳細を取得
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // タスク一覧を取得
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // チームメンバー一覧を取得
      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', projectData.team_id);

      let membersData: TeamMember[] = [];
      if (teamMembersData && teamMembersData.length > 0) {
        const userIds = teamMembersData.map(member => member.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        if (profiles) {
          membersData = profiles as TeamMember[];
        }
      }

      const tasks = tasksData || [];
      calculateTaskStatistics(tasks.map(task => ({ status: task.status })));

      return {
        project: projectData as Project,
        tasks,
        members: membersData,
      };
    }, {
      errorMessage: 'プロジェクトの読み込みに失敗しました',
    });

    if (data) {
      setProject(data.project);
      setTasks(data.tasks);
      setMembers(data.members);
    }
  };

  const updateProject = async (updates: Partial<Omit<Project, 'id' | 'created_at'>>) => {
    if (!project) return;

    const result = await mutateData(async () => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    }, {
      successMessage: 'プロジェクトを更新しました',
      errorMessage: 'プロジェクトの更新に失敗しました',
    });

    if (result) {
      setProject(result);
    }
  };

  const addTask = async (task: Omit<Task, 'id' | 'project_id'>) => {
    const result = await mutateData(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...task, project_id: projectId }])
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    }, {
      successMessage: 'タスクを作成しました',
      errorMessage: 'タスクの作成に失敗しました',
    });

    if (result) {
      setTasks([result, ...tasks]);
      calculateTaskStatistics([...tasks, result].map(task => ({ status: task.status })));
    }
  };

  const loadTaskStatistics = async () => {
    if (!project) return;

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', projectId);

    if (tasksData) {
      calculateTaskStatistics(tasksData as TaskStatus[]);
    }
  };

  return {
    project,
    tasks,
    members,
    taskStats,
    loading,
    error,
    loadProject,
    updateProject,
    addTask,
    loadTaskStatistics,
  };
}