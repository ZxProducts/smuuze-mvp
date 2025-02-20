// ProjectUpdate 型定義を修正
export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

import { createClient } from '@supabase/supabase-js';
import { Database, TeamMember, Profile, ProjectWithTasks, Task } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Tables = Database['public']['Tables'];
export type TeamRow = Tables['teams']['Row'];
export type ProjectRow = Tables['projects']['Row'];
export type TaskRow = Tables['tasks']['Row'];
export type TimeEntryRow = Tables['time_entries']['Row'];
export type ProfileRow = Tables['profiles']['Row'];
export type TaskCommentRow = Tables['task_comments']['Row'];
export type TaskHistoryRow = Tables['task_history']['Row'];
export type { TeamMember };

export class DatabaseError extends Error {
  constructor(message: string, public originalError: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// タスク統計の型定義を修正
export interface TaskStatistics {
  total: number;
}

// プロジェクト詳細の型定義
export interface ProjectDetails extends ProjectRow {
  tasks: TaskRow[];
  taskStats: TaskStatistics;
}

// タスク詳細の型定義
export interface TaskDetail extends TaskRow {
  assignee: {
    id: string;
    full_name: string;
  } | null;
  comments: (TaskCommentRow & {
    author: {
      id: string;
      full_name: string;
    };
  })[];
}

// dbOperations内のメソッドはそのまま
export const dbOperations = {
  // プロファイル操作
  profiles: {
    async getById(id: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new DatabaseError('プロファイルの取得に失敗しました', error);
      return data;
    },

    async update(id: string, updates: Partial<Tables['profiles']['Update']>) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new DatabaseError('プロファイルの更新に失敗しました', error);
      return data;
    },
  },

  // チーム操作
  teams: {
    async getById(id: string) {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(*)')
        .eq('id', id)
        .single();

      if (error) throw new DatabaseError('チーム情報の取得に失敗しました', error);
      return data;
    },

    async getUserTeam(userId: string) {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .single();

      if (error) throw new DatabaseError('チーム情報の取得に失敗しました', error);
      if (!data) throw new DatabaseError('チームに所属していません', null);
      
      return data;
    },

    async getTeamMembers(teamId: string): Promise<TeamMember[]> {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq('team_id', teamId);

      if (error) throw new DatabaseError('チームメンバーの取得に失敗しました', error);

      if (!data) return [];
      
      return data.map((member): TeamMember => ({
        id: member.id,
        team_id: member.team_id,
        user_id: member.user_id,
        hourly_rate: member.hourly_rate,
        daily_work_hours: member.daily_work_hours,
        weekly_work_days: member.weekly_work_days,
        meeting_included: member.meeting_included,
        notes: member.notes,
        joined_at: member.joined_at,
        role: member.role,
        profile: member.profiles
      }));
    },

    async create(data: Tables['teams']['Insert']) {
      const { data: team, error } = await supabase
        .from('teams')
        .insert(data)
        .select()
        .single();

      if (error) throw new DatabaseError('チームの作成に失敗しました', error);
      return team;
    },
  },

  // プロジェクト操作
  projects: {
    // プロジェクト取得時の戻り値の型を更新
    async list() {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Executing query:', supabase.from('projects').select('*').order('created_at', { ascending: false }).toString());

      if (error) {
        console.log('ERROR-LOG:' + error.message);
        throw new DatabaseError('プロジェクト一覧の取得に失敗しました', error);
      }
      return data;
    },

    async getById(id: string): Promise<ProjectWithTasks> {
      // まずプロジェクトとタスクを取得
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          tasks (*)
        `)
        .eq('id', id)
        .single();

      if (projectError) throw new DatabaseError('プロジェクトの取得に失敗しました', projectError);

      // 各タスクのアサイン情報を取得
      const tasksWithAssignees = await Promise.all(
        projectData.tasks.map(async (task: Task) => {
          const { data: assigneeData, error: assigneeError } = await supabase
            .from('task_assignees')
            .select(`
              task_id,
              profile:profiles!task_assignees_user_id_fkey (
                id,
                full_name,
                created_at,
                updated_at
              )
            `)
            .eq('task_id', task.id);

          if (assigneeError) {
            console.error('タスクのアサイン情報の取得に失敗しました:', assigneeError);
            return { ...task, assignees: [] };
          }

          return {
            ...task,
            assignees: assigneeData.map((assignee: any) => assignee.profile)
          };
        })
      );

      return {
        ...projectData,
        tasks: tasksWithAssignees
      };
    },

    async create(data: Tables['projects']['Insert']) {
      const { data: project, error } = await supabase
        .from('projects')
        .insert(data)
        .select()
        .single();

      if (error) throw new DatabaseError('プロジェクトの作成に失敗しました', error);
      return project;
    },

    async update(id: string, updates: ProjectUpdate) {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new DatabaseError('プロジェクトの更新に失敗しました', error);
      return data;
    },

    async getProjectTimeEntries(id: string) {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user:user_id(
            id,
            full_name
          ),
          task:task_id(
            id,
            title
          )
        `)
        .eq('project_id', id)
        .order('start_time', { ascending: false });

      if (error) throw new DatabaseError('プロジェクトの作業時間データの取得に失敗しました', error);
      return data;
    },
  },

  // タスク操作
  tasks: {
    async getProjectStats(projectId: string): Promise<TaskStatistics> {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId);

      if (error) throw new DatabaseError('タスク統計の取得に失敗しました', error);

      return { total: count || 0 };
    },

    async getById(id: string): Promise<TaskDetail> {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles(id, full_name),
          comments:task_comments(
            *,
            author:profiles(id, full_name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw new DatabaseError('タスクの取得に失敗しました', error);
      return data;
    },

    async create(data: Tables['tasks']['Insert']) {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert(data)
        .select()
        .single();

      if (error) throw new DatabaseError('タスクの作成に失敗しました', error);
      return task;
    },

    async update(id: string, updates: Partial<TaskRow>) {
      const { data: task, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          assignee:profiles(id, full_name),
          comments:task_comments(
            *,
            author:profiles(id, full_name)
          )
        `)
        .single();

      if (error) throw new DatabaseError('タスクの更新に失敗しました', error);
      return task;
    },

    async delete(id: string) {
      // 関連データの削除を含むトランザクション
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .delete()
        .eq('task_id', id);

      if (timeEntriesError) {
        throw new DatabaseError('作業記録の削除に失敗しました', timeEntriesError);
      }

      const { error: commentsError } = await supabase
        .from('task_comments')
        .delete()
        .eq('task_id', id);

      if (commentsError) {
        throw new DatabaseError('コメントの削除に失敗しました', commentsError);
      }

      const { error: historyError } = await supabase
        .from('task_history')
        .delete()
        .eq('task_id', id);

      if (historyError) {
        throw new DatabaseError('タスク履歴の削除に失敗しました', historyError);
      }

      // 最後にタスク自体を削除
      const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (taskError) {
        throw new DatabaseError('タスクの削除に失敗しました', taskError);
      }

      return true;
    },

    async addComment(data: Tables['task_comments']['Insert']) {
      const { data: comment, error } = await supabase
        .from('task_comments')
        .insert(data)
        .select(`
          *,
          author:author_id(id, full_name)
        `)
        .single();

      if (error) throw new DatabaseError('コメントの追加に失敗しました', error);
      return comment;
    },

    async getComments(taskId: string) {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          author:author_id(id, full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw new DatabaseError('コメントの取得に失敗しました', error);
      return data;
    },
  },

  // タイムエントリー操作
  timeEntries: {
    async getUserTimeEntries(userId: string) {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user:user_id (
            id,
            full_name
          )
        `)
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (error) throw new DatabaseError('作業記録の取得に失敗しました', error);
      return data;
    },

    async getCurrentEntry(userId: string) {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .is('end_time', null)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw new DatabaseError('現在の作業記録の取得に失敗しました', error);
      }
      return data;
    },

    async start(data: Tables['time_entries']['Insert']) {
      const current = await this.getCurrentEntry(data.user_id);
      if (current) {
        throw new DatabaseError('既に作業を開始しています', null);
      }

      const { data: entry, error } = await supabase
        .from('time_entries')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.log(error);
        throw new DatabaseError('作業記録の開始に失敗しました', error);
      }
      return entry;
    },

    async stop(userId: string): Promise<TimeEntryRow> {
      const current = await this.getCurrentEntry(userId);
      if (!current) {
        throw new DatabaseError('アクティブな作業記録が見つかりません', null);
      }

     try {
       const endTime = new Date().toISOString();
       console.log('停止処理開始:', { current_id: current.id, userId, endTime });
       
       // まず更新を実行
       const { error: updateError } = await supabase
         .from('time_entries')
         .update({
           end_time: endTime,
           updated_at: new Date().toISOString()
         })
         .eq('id', current.id)
         .eq('user_id', userId);

       if (updateError) {
         console.error('作業記録の更新エラー:', {
           error: updateError,
           recordInfo: { id: current.id, userId }
         });
         throw new DatabaseError('作業記録の更新に失敗しました', updateError);
       }

       // 更新後のデータを取得
       const { data, error: selectError } = await supabase
         .from('time_entries')
         .select('*')
         .eq('id', current.id)
         .eq('user_id', userId)
         .maybeSingle();

       if (selectError) {
         throw new DatabaseError('更新後のデータの取得に失敗しました', selectError);
       }

       // レコードが見つからない場合
       if (!data) {
         console.error('更新後のレコードが見つかりません:', { id: current.id, userId });
         throw new DatabaseError('更新後のレコードが見つかりません', null);
       }

       return data;
      } catch (error) {
        console.error('作業記録の停止中にエラーが発生しました:', error);
        throw error;
      }
    },

    async getTaskEntries(taskId: string) {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user:user_id(id, full_name)
        `)
        .eq('task_id', taskId)
        .order('start_time', { ascending: false });

      if (error) throw new DatabaseError('作業記録の取得に失敗しました', error);
      return data;
    },
  },
};