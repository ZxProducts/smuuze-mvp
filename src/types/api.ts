import { Database } from './database.types';

// データベースの型定義から派生型を作成
type Tables = Database['public']['Tables'];
export type Profile = Tables['profiles']['Row'];
export type Team = Tables['teams']['Row'];
export type TeamMember = Tables['team_members']['Row'];
export type Offer = Tables['offers']['Row'];
export type Project = Tables['projects']['Row'];
export type Task = Tables['tasks']['Row'];

// ダッシュボード関連の型定義
export interface TimeStats {
  totalTime: string;
  topProject: {
    name: string;
    time: string;
  };
  monthlyDistribution: {
    month: number;
    totalTime: string;
    byProject: {
      project_id: string;
      project_name: string;
      time: string;
    }[];
  }[];
  projectDistribution: {
    project_id: string;
    project_name: string;
    time: string;
    percentage: number;
  }[];
}

// プロジェクト関連の型定義
export interface TaskStatistics {
  total: number;
}

// タスク関連の型定義
export interface UpdateTaskAssigneesRequest {
  assigneeIds: string[];
}

export interface ProjectResponse extends Project {
  tasks: TaskStatistics;
}

export interface ProjectDetailResponse extends Project {
  tasks: {
    id: string;
    title: string;
    description: string | null;
    project_id: string;
    team_id: string;
    status: 'not_started' | 'in_progress' | 'completed';
    due_date: string | null;
    created_at: string;
    updated_at: string;
    assignees: Profile[];
  }[];
  timeEntries: {
    id: string;
    task_id: string | null;
    start_time: string;
    end_time: string | null;
    description: string | null;
    user: {
      id: string;
      full_name: string;
    };
    task?: {
      id: string;
      title: string;
    } | null;
  }[];
}

// API共通のレスポンス型
export interface ErrorResponse {
  error: string;
  status: number;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  error?: ErrorResponse;
}

// 認証関連の基本型
export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
  profile?: Profile;
}

// 認証API用の型定義
export interface AuthResponse {
  user: AuthUser;
  session: AuthSession;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface SignupResponse {
  message: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
}

// チームアクティビティ関連の型定義
export interface TeamMemberActivity {
  id: string;
  full_name: string;
  latest_activity: {
    project_name: string;
    description: string;
    timestamp: string;
  } | null;
  total_time: string;
  time_percentage: number;
}

// チーム関連
export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

// チームの基本情報のみを含む型（プロフィール用）
export interface TeamBasicInfo {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TeamDetails extends Team {
  members: TeamMemberResponse[];
  offers: Offer[];
}

export type TeamResponse = TeamDetails;

// メンバー関連
export interface TeamMemberResponse {
  id: string;
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
  hourly_rate: number;
  daily_work_hours: number;
  weekly_work_days: number;
  meeting_included: boolean;
  notes?: string;
  joined_at: string;
  profile: Profile;
}

export interface CreateTeamMemberRequest {
  role: 'admin' | 'member';
  hourly_rate: number;
  daily_work_hours: number;
  weekly_work_days: number;
  meeting_included: boolean;
  notes?: string;
}

// オファー関連
export interface CreateOfferRequest {
  email: string;
  hourly_rate: number;
  daily_work_hours: number;
  weekly_work_days: number;
  meeting_included: boolean;
  notes?: string;
}

export interface OfferResponse extends Offer {
  team?: {
    id: string;
    name: string;
  };
  message?: string; // APIレスポンスのメッセージを含む
}

// プロフィール関連
export interface UpdateProfileRequest {
  full_name?: string;
}

export interface ProfileResponse extends Profile {
  teams?: TeamBasicInfo[];
}

// 共通レスポンス型
export interface MessageResponse {
  message: string;
}