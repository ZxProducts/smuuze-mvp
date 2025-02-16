export interface Database {
  public: {
    Tables: {
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
  owner_id: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
export type ProjectUpdate = Partial<ProjectInsert>;

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface BaseTask {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  team_id: string;
  assignee_id: string | null;
  assigned_to?: string | null; // 後方互換性のため
  due_date: string | null;
}

export interface Task extends BaseTask {
  id: string;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = BaseTask;
export type TaskUpdate = Partial<BaseTask>;

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  project_id: string;
  start_time: string;
  end_time: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeEntryInsert = Pick<TimeEntry, 'task_id' | 'user_id' | 'project_id' | 'start_time'> & {
  end_time?: string | null;
  description?: string | null;
};

export type TimeEntryUpdate = Partial<TimeEntryInsert>;

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCommentWithAuthor extends TaskComment {
  author: {
    id: string;
    full_name: string;
  };
  comment?: string;  // 後方互換性のため
}

export type TaskCommentInsert = Pick<TaskComment, 'task_id' | 'user_id' | 'content'>;
export type TaskCommentUpdate = Partial<TaskCommentInsert>;

export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  change_type: string;
  previous_value: string | null;
  new_value: string | null;
  created_at: string;
}

export type TaskHistoryInsert = Omit<TaskHistory, 'id' | 'created_at'>;
export type TaskHistoryUpdate = Partial<TaskHistoryInsert>;

export interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export type TeamInsert = Omit<Team, 'id' | 'created_at' | 'updated_at'>;
export type TeamUpdate = Partial<TeamInsert>;

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
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
  role: string;
  created_at: string;
  updated_at: string;
  profile: Profile;
}

export type TeamMemberInsert = Pick<TeamMember, 'team_id' | 'user_id' | 'role'>;
export type TeamMemberUpdate = Partial<TeamMemberInsert>;

export interface TeamMemberWithProfile extends TeamMember {
  profile: Profile;
  full_name?: string;  // 後方互換性のため
}

export interface TimeEntryWithDetails extends TimeEntry {
  task: Task;
  user: {
    id: string;
    full_name: string;
  };
}

export interface TaskWithTimeEntries extends Task {
  time_entries: TimeEntry[];
  assignee?: Profile;
}

export interface TaskDetail extends Task {
  project: Project;
  assignee: Profile | null;
  time_entries: TimeEntry[];
  comments: TaskCommentWithAuthor[];
  history: TaskHistory[];
}

export interface ProjectWithTasks extends Project {
  tasks: TaskWithTimeEntries[];
  team_members?: TeamMemberWithProfile[];
}

export interface TimeEntryWithUser extends TimeEntry {
  user: {
    id: string;
    full_name: string;
  };
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
  status: string;
  priority: string;
  project_id: string;
  team_id: string;
  assignee_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  assignee: Profile | null;
  time_entries: DatabaseTimeEntry[];
  comments: Array<{
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
    author: {
      id: string;
      full_name: string;
    };
  }>;
  history: Array<{
    id: string;
    task_id: string;
    user_id: string;
    change_type: string;
    previous_value: string | null;
    new_value: string | null;
    created_at: string;
  }>;
}

export interface DatabaseTeamMemberResponse {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  profiles: Profile;
}