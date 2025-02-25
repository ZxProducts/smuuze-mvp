export interface Database {
  public: {
    Tables: {
      offers: {
        Row: Offer;
        Insert: OfferInsert;
        Update: OfferUpdate;
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: TaskUpdate;
      };
      task_assignees: {
        Row: TaskAssignee;
        Insert: TaskAssigneeInsert;
        Update: TaskAssigneeUpdate;
      };
      time_entries: {
        Row: TimeEntry;
        Insert: TimeEntryInsert;
        Update: TimeEntryUpdate;
      };
      task_comments: {
        Row: TaskComment;
        Insert: TaskCommentInsert;
        Update: TaskCommentUpdate;
      };
      task_history: {
        Row: TaskHistory;
        Insert: TaskHistoryInsert;
        Update: TaskHistoryUpdate;
      };
      teams: {
        Row: Team;
        Insert: TeamInsert;
        Update: TeamUpdate;
      };
      team_members: {
        Row: TeamMember;
        Insert: TeamMemberInsert;
        Update: TeamMemberUpdate;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
    };
  };
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
  created_by: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
export type ProjectUpdate = Partial<ProjectInsert>;

export interface BaseTask {
  title: string;
  description: string | null;
  project_id: string;
  team_id: string;
  due_date: string | null;
}

export interface Task extends BaseTask {
  id: string;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = BaseTask;
export type TaskUpdate = Partial<BaseTask>;

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssigneeWithProfile extends TaskAssignee {
  profiles: Profile;
}

export type TaskAssigneeInsert = Pick<TaskAssignee, 'task_id' | 'user_id'>;
export type TaskAssigneeUpdate = Partial<TaskAssigneeInsert>;

export interface TimeEntry {
  id: string;
  task_id: string | null;
  user_id: string;
  project_id: string;
  start_time: string;
  end_time: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeEntryInsert = Pick<TimeEntry, 'user_id' | 'project_id' | 'start_time'> & {
  task_id?: string | null;
  end_time?: string | null;
  description?: string | null;
};

export type TimeEntryUpdate = Partial<TimeEntryInsert>;

export interface TimeEntryWithDetails extends TimeEntry {
  task?: {
    id: string;
    title: string;
  } | null;
  user: {
    id: string;
    full_name: string;
  };
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCommentWithAuthor extends Omit<TaskComment, 'comment'> {
  author: {
    id: string;
    full_name: string;
  };
  content: string;  // commentをcontentとして扱う
}

export type TaskCommentInsert = Pick<TaskComment, 'task_id' | 'author_id' | 'comment'>;
export type TaskCommentUpdate = Partial<TaskCommentInsert>;

export interface TaskHistory {
  id: string;
  task_id: string;
  changed_by: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  author?: {
    id: string;
    full_name: string;
  };
}

export type TaskHistoryInsert = Omit<TaskHistory, 'id' | 'changed_at'>;
export type TaskHistoryUpdate = Partial<TaskHistoryInsert>;

export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type TeamInsert = Omit<Team, 'id' | 'created_at' | 'updated_at'>;
export type TeamUpdate = Partial<TeamInsert>;

export interface Offer {
  id: string;
  team_id: string;
  email: string;
  hourly_rate: number;
  daily_work_hours: number;
  weekly_work_days: number;
  meeting_included: boolean;
  notes: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  token: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type OfferInsert = Omit<Offer, 'id' | 'token' | 'created_at' | 'updated_at'>;
export type OfferUpdate = Partial<OfferInsert>;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<ProfileInsert>;

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  hourly_rate: number;
  daily_work_hours: number;
  weekly_work_days: number;
  meeting_included: boolean;
  notes: string | null;
  joined_at: string;
  role: 'admin' | 'member';
  profile: Profile;
}

export type TeamMemberInsert = Pick<TeamMember, 'team_id' | 'user_id' | 'role'>;
export type TeamMemberUpdate = Partial<TeamMemberInsert>;

export interface TeamMemberWithProfile extends TeamMember {
  profile: Profile;
  full_name?: string;  // 後方互換性のため
}

export interface TaskDetail extends Task {
  project: Project;
  assignees: Profile[];
  time_entries: TimeEntry[];
  comments: TaskCommentWithAuthor[];
  history: TaskHistory[];
}

export interface ProjectWithTasks extends Project {
  tasks: Task[];
  team_members?: TeamMemberWithProfile[];
}

export interface DatabaseTimeEntry {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  description: string | null;
  user: {
    id: string;
    full_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DatabaseTaskResponse {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
  team_id: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  assignees: Profile[];
  time_entries: DatabaseTimeEntry[];
  comments: Array<{
    id: string;
    task_id: string;
    author_id: string;
    comment: string;
    created_at: string;
    author: {
      id: string;
      full_name: string;
    };
  }>;
  history: Array<{
    id: string;
    task_id: string;
    changed_by: string;
    change_type: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: string;
    author: {
      id: string;
      full_name: string;
    };
  }>;
}

export interface DatabaseTeamMemberResponse {
  id: string;
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
  profiles: Profile;
}