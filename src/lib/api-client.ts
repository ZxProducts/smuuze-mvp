import {
  ApiResponse,
  Profile,
  Team,
  TeamResponse,
  CreateTeamRequest,
  UpdateTeamRequest,
  CreateOfferRequest,
  OfferResponse,
  UpdateProfileRequest,
  UpdateTaskAssigneesRequest,
  MessageResponse,
  TimeStats,
  TeamMemberActivity,
  Project,
} from '@/types/api';

interface ApiClientOptions {
  baseUrl?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: {} as T,
        error: {
          error: data.error,
          status: response.status,
          details: data.details
        }
      };
    }

    return {
      data: data.data as T
    };
  }

  // ユーザー関連のAPI
  users = {
    // プロフィール取得
    me: async (): Promise<ApiResponse<Profile>> => {
      return this.request<Profile>('/api/users/me');
    },

    // プロフィール更新
    updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<Profile>> => {
      return this.request<Profile>('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  };

  // タスク関連のAPI
  tasks = {
    // タスクの担当者を更新
    updateAssignees: async (taskId: string, data: UpdateTaskAssigneesRequest): Promise<ApiResponse<MessageResponse>> => {
      return this.request<MessageResponse>(`/api/tasks/${taskId}/assignees`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  };

  // プロジェクト関連のAPI
  projects = {
    // プロジェクト一覧を取得
    list: async (params?: { teamId?: string }): Promise<ApiResponse<Project[]>> => {
      const query = params?.teamId ? `?teamId=${params.teamId}` : '';
      return this.request<Project[]>(`/api/projects${query}`);
    },
  };

  // タイムエントリー関連のAPI
  timeEntries = {
    // ダッシュボード用の統計情報を取得
    getStats: async (params?: {
      teamId?: string;
      projectId?: string;
    }): Promise<ApiResponse<TimeStats>> => {
      const searchParams = new URLSearchParams();
      if (params?.teamId) searchParams.append('teamId', params.teamId);
      if (params?.projectId) searchParams.append('projectId', params.projectId);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return this.request<TimeStats>(`/api/time-entries/stats${query}`);
    },
  };

  // チーム関連のAPI
  teams = {
    // チーム一覧を取得
    list: async (): Promise<ApiResponse<TeamResponse[]>> => {
      return this.request<TeamResponse[]>('/api/teams');
    },

    // チームを取得
    get: async (id: string): Promise<ApiResponse<TeamResponse>> => {
      return this.request<TeamResponse>(`/api/teams/${id}`);
    },

    // チームを作成
    create: async (data: CreateTeamRequest): Promise<ApiResponse<Team>> => {
      return this.request<Team>('/api/teams', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // チームを更新
    update: async (id: string, data: UpdateTeamRequest): Promise<ApiResponse<Team>> => {
      return this.request<Team>(`/api/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    // チームを削除
    delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
      return this.request<{ message: string }>(`/api/teams/${id}`, {
        method: 'DELETE',
      });
    },

    // オファー作成
    createOffer: async (teamId: string, data: CreateOfferRequest): Promise<ApiResponse<OfferResponse>> => {
      return this.request<OfferResponse>(`/api/teams/${teamId}/offers`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // メンバー削除
    removeMember: async (teamId: string, memberId: string): Promise<ApiResponse<{ message: string }>> => {
      return this.request<{ message: string }>(
        `/api/teams/${teamId}/members/${memberId}`,
        {
          method: 'DELETE',
        }
      );
    },

    // チームメンバーのアクティビティを取得
    getActivities: async (): Promise<ApiResponse<TeamMemberActivity[]>> => {
      return this.request<TeamMemberActivity[]>('/api/teams/activities');
    },
  };
}

// APIクライアントのインスタンスを作成
export const apiClient = new ApiClient();