export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      offers: {
        Row: {
          id: string
          team_id: string
          email: string
          hourly_rate: number
          daily_work_hours: number
          weekly_work_days: number
          meeting_included: boolean
          notes: string | null
          status: 'pending' | 'accepted' | 'rejected'
          token: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          hourly_rate: number
          daily_work_hours?: number
          weekly_work_days?: number
          meeting_included?: boolean
          notes?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          token: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          email?: string
          hourly_rate?: number
          daily_work_hours?: number
          weekly_work_days?: number
          meeting_included?: boolean
          notes?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          token?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'member'
          created_at: string
          updated_at: string
          email: string
        }
        Insert: {
          id: string
          full_name: string
          role: 'admin' | 'member'
          created_at?: string
          updated_at?: string
          email: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'member'
          created_at?: string
          updated_at?: string
          email?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          team_id: string
          name: string
          description: string | null
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          description?: string | null
          start_date: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          team_id: string
          project_id: string | null
          period: string
          report_data: Json
          status: 'draft' | 'finalized'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          project_id?: string | null
          period: string
          report_data: Json
          status?: 'draft' | 'finalized'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          project_id?: string | null
          period?: string
          report_data?: Json
          status?: 'draft' | 'finalized'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      task_assignees: {
        Row: {
          id: string
          task_id: string | null
          user_id: string | null
          assigned_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id?: string | null
          user_id?: string | null
          assigned_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string | null
          user_id?: string | null
          assigned_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          author_id: string
          comment: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          author_id: string
          comment: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          author_id?: string
          comment?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      task_history: {
        Row: {
          id: string
          task_id: string
          changed_by: string
          change_type: 'assignment_change' | 'update'
          old_value: Json | null
          new_value: Json | null
          change_reason: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          task_id: string
          changed_by: string
          change_type: 'assignment_change' | 'update'
          old_value?: Json | null
          new_value?: Json | null
          change_reason?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          changed_by?: string
          change_type?: 'assignment_change' | 'update'
          old_value?: Json | null
          new_value?: Json | null
          change_reason?: string | null
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_changed_by_fkey"
            columns: ["changed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          team_id: string
          title: string
          description: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          team_id: string
          title: string
          description?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          team_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          hourly_rate: number
          daily_work_hours: number
          weekly_work_days: number
          meeting_included: boolean
          notes: string | null
          joined_at: string
          role: 'admin' | 'member'
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          hourly_rate: number
          daily_work_hours: number
          weekly_work_days: number
          meeting_included?: boolean
          notes?: string | null
          joined_at?: string
          role?: 'admin' | 'member'
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          hourly_rate?: number
          daily_work_hours?: number
          weekly_work_days?: number
          meeting_included?: boolean
          notes?: string | null
          joined_at?: string
          role?: 'admin' | 'member'
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          project_id: string
          task_id: string | null
          start_time: string
          end_time: string | null
          break_minutes: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          task_id?: string | null
          start_time: string
          end_time?: string | null
          break_minutes?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          task_id?: string | null
          start_time?: string
          end_time?: string | null
          break_minutes?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_team_member: {
        Args: {
          p_user_id: string
          p_team_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
