import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Supabaseクライアントインスタンス
 * 環境変数から設定を読み込み、アプリケーション全体で使用する単一のインスタンスを提供
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * 型定義
 */

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  description: string;
  start_time: Date;
  end_time?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  team_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  id: string;
  full_name: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * データベース操作用のヘルパー関数
 */

// タイムエントリー関連
export async function createTimeEntry(data: Partial<TimeEntry>) {
  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return entry;
}

export async function updateTimeEntry(id: string, data: Partial<TimeEntry>) {
  const { data: entry, error } = await supabase
    .from('time_entries')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return entry;
}

export async function getTimeEntries(userId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      projects (
        name
      )
    `)
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (error) throw error;
  return data;
}

// プロジェクト関連
export async function getProjects(teamId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('team_id', teamId)
    .order('name');

  if (error) throw error;
  return data;
}

// プロフィール関連
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, data: Partial<Profile>) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return profile;
}