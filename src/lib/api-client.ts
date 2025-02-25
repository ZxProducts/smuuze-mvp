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
  };
}

// APIクライアントのインスタンスを作成
export const apiClient = new ApiClient();