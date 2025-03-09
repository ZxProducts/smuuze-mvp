'use client';

import { useState, useEffect } from 'react';
import { Search, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateProjectDialog } from './create-project-dialog';
import { useCallback } from 'react';
import { EditProjectDialog } from './edit-project-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// プロジェクトの型定義
interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  total_hours?: string;
  progress?: string;
  public?: boolean;
  team_id: string;
  created_at: string;
  updated_at?: string;
}

// ダッシュボードAPIのレスポンス型
interface DashboardDataResponse {
  totalTime: string;
  topProject: {
    id: string;
    name: string;
  } | null;
  projectBreakdown: {
    id: string;
    name: string;
    totalTime: string;
    totalSeconds: number;
    percentage: number;
  }[];
}

// チームの型定義
interface Team {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
}

// チームメンバーの型定義
interface TeamMember {
  team_id: string;
  user_id: string;
  role: string;
}

// プロジェクトとチーム情報を合わせた型定義
interface ProjectWithTeam extends Project {
  team_name?: string;
  can_edit?: boolean;
}

export function ProjectsContent() {
  const [projects, setProjects] = useState<ProjectWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithTeam | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithTeam | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [projectTimes, setProjectTimes] = useState<{[key: string]: string}>({});

  // チーム情報を取得
  const fetchTeams = async () => {
    try {
      // チーム情報を取得
      const teamsResponse = await fetch('/api/teams');
      if (!teamsResponse.ok) {
        throw new Error('チームの取得に失敗しました');
      }
      const teamsData = await teamsResponse.json();
      const teams = teamsData.teams || [];
      
      // 現在のユーザー情報を取得
      const userResponse = await fetch('/api/auth/me');
      const userData = await userResponse.json();
      const currentUserId = userData.user?.id;
      
      // 現在のユーザーが少なくとも1つのチームで管理者であるかチェック
      let userIsAdmin = false;
      teams.forEach((team: any) => {
        if (team.team_members) {
          team.team_members.forEach((member: any) => {
            if (member.user_id === currentUserId && member.role === 'admin') {
              userIsAdmin = true;
            }
          });
        }
      });
      
      setIsAdmin(userIsAdmin);
      return { teams, currentUserId };
    } catch (error: any) {
      console.error('チーム取得エラー:', error);
      return { teams: [], currentUserId: '' };
    }
  };

  // プロジェクト一覧を取得
  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // チーム情報を取得
      const { teams: teamsData, currentUserId } = await fetchTeams();
      setTeams(teamsData);
      
      // プロジェクト一覧を取得
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('プロジェクトの取得に失敗しました');
      }
      const data = await response.json();
      
      // 各プロジェクトのチームメンバー情報を取得
      const projectsWithTeamPromises = (data.projects || []).map(async (project: Project) => {
        const team = teamsData.find((t: Team) => t.id === project.team_id);
        
        // チームメンバー情報を取得
        try {
          const membersResponse = await fetch(`/api/teams/${project.team_id}/members`);
          if (!membersResponse.ok) {
            console.error(`チーム ${project.team_id} のメンバー取得に失敗: ${membersResponse.status}`);
            return {
              ...project,
              team_name: team?.name || '不明なチーム',
              can_edit: false
            };
          }
          
          const membersData = await membersResponse.json();
          const members = membersData.members || [];
          
          // ユーザーがこのチームの管理者かどうかを確認
          const userTeamMember = members.find(
            (member: any) => member.user_id === currentUserId
          );
          const canEdit = userTeamMember?.role === 'admin';
          
          return {
            ...project,
            team_name: team?.name || '不明なチーム',
            can_edit: canEdit
          };
        } catch (error) {
          console.error(`チーム ${project.team_id} のメンバー取得に失敗:`, error);
          return {
            ...project,
            team_name: team?.name || '不明なチーム',
            can_edit: false
          };
        }
      });
      
      // すべてのプロジェクト情報を取得
      const projectsWithTeam = await Promise.all(projectsWithTeamPromises);
      setProjects(projectsWithTeam);
    } catch (error: any) {
      setError(error.message || 'プロジェクトの取得中にエラーが発生しました');
      console.error('プロジェクト取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ダッシュボードAPIからプロジェクトの追跡時間を取得
  const fetchProjectTimes = async () => {
    try {
      // 当月のプロジェクト時間を取得（デフォルトで当月）
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('ダッシュボードデータの取得に失敗しました');
      }
      
      const data: DashboardDataResponse = await response.json();
      
      // プロジェクトごとの時間を抽出
      const times: {[key: string]: string} = {};
      data.projectBreakdown.forEach(project => {
        times[project.id] = project.totalTime;
      });
      
      setProjectTimes(times);
    } catch (error: any) {
      console.error('プロジェクト時間の取得に失敗しました:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchProjectTimes();
  }, []);

  // プロジェクト作成後に一覧と時間を再取得
  const handleProjectCreated = () => {
    fetchProjects();
    fetchProjectTimes();
  };

  // プロジェクト削除処理
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    setIsSubmitting(true);
    setActionError('');
    
    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロジェクトの削除に失敗しました');
      }
      
      // ダイアログを閉じる
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
      
      // プロジェクト一覧と時間を再取得
      fetchProjects();
      fetchProjectTimes();
    } catch (error: any) {
      setActionError(error.message || 'プロジェクトの削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 検索を適用したプロジェクト一覧
  const filteredProjects = projects.filter(project => {
    // 検索クエリでフィルタリング
    return project.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">プロジェクト</h1>
        {isAdmin && <CreateProjectDialog onProjectCreated={handleProjectCreated} />}
      </div>

      <div className="mb-4 flex items-center justify-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input 
            className="w-64 pl-9" 
            placeholder="名前で検索" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">
          {error}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="border-b bg-gray-50 p-3 text-sm">プロジェクト</div>
          <div className="grid grid-cols-4 border-b bg-gray-50 p-3 text-sm">
            <div className="font-medium">名前</div>
            <div className="font-medium">チーム</div>
            <div className="font-medium">追跡時間</div>
            <div className="font-medium text-right">アクション</div>
          </div>
          
          {filteredProjects.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? '検索条件に一致するプロジェクトがありません' : 'プロジェクトがありません'}
            </div>
          ) : (
            filteredProjects.map((project: ProjectWithTeam) => (
              <div key={project.id} className="grid grid-cols-4 border-b p-3 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  <span>{project.name}</span>
                </div>
                <div>
                  <span>{project.team_name}</span>
                </div>
                <div>{projectTimes[project.id] || '00時間00分'}</div>
                <div className="text-right">
                  {project.can_edit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setEditingProject(project)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          <span>編集</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => {
                            setProjectToDelete(project);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>削除</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* プロジェクト編集ダイアログ */}
      {editingProject && (
        <EditProjectDialog 
          project={editingProject} 
          onProjectUpdated={() => {
            fetchProjects();
            fetchProjectTimes();
          }} 
          canEdit={true}
          open={!!editingProject}
          onOpenChange={(open) => {
            if (!open) setEditingProject(null);
          }}
        />
      )}

      {/* プロジェクト削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>プロジェクトを削除</AlertDialogTitle>
            <AlertDialogDescription>
              本当に「{projectToDelete?.name}」を削除しますか？この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError && (
            <div className="text-sm text-red-500 mt-2">
              {actionError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isSubmitting}
              onClick={() => {
                setProjectToDelete(null);
                setActionError('');
              }}
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
