'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateTeamDialog } from './create-team-dialog';
import { AddMemberDialog } from './add-member-dialog';
import { MemberActions } from './member-actions';
import { EditTeamDialog } from './edit-team-dialog';
import { DeleteTeamDialog } from './delete-team-dialog';

// チームメンバーの型定義
interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  };
}

// チームの型定義
interface Team {
  id: string;
  name: string;
  created_at: string;
  members?: TeamMember[];
}

interface TeamContentProps {
  teamsWithMembers: Team[];
}

export function TeamContent({ teamsWithMembers }: TeamContentProps) {
  const [teams, setTeams] = useState<Team[]>(teamsWithMembers);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // 現在のユーザーIDを取得
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            console.log('現在のユーザーID:', data.user.id);
            setCurrentUserId(data.user.id);
          } else {
            console.error('ユーザー情報が取得できませんでした');
          }
        } else {
          console.error('ユーザー情報の取得に失敗しました:', response.status);
        }
      } catch (error) {
        console.error('ユーザー情報の取得に失敗しました:', error);
      }
    };
    
    getCurrentUser();
  }, []);

  // 現在のユーザーがチームの管理者かどうかを確認
  const isCurrentUserAdmin = (team: Team) => {
    if (!team.members || !currentUserId) {
      console.log(`チームメンバーまたはユーザーIDが不足しています - チームID: ${team.id}, メンバー数: ${team.members?.length || 0}, ユーザーID: ${currentUserId || 'なし'}`);
      return false;
    }
    
    const currentUserMember = team.members.find(member => 
      member.user_id === currentUserId
    );
    
    if (!currentUserMember) {
      console.log(`現在のユーザー(${currentUserId})はチーム(${team.id})のメンバーではありません`);
      return false;
    }
    
    const isAdmin = currentUserMember.role === 'admin';
    console.log(`ユーザー(${currentUserId})のチーム(${team.id})での役割: ${currentUserMember.role}, 管理者?: ${isAdmin}`);
    
    return isAdmin;
  };

  // チーム作成後にチーム一覧を再取得
  const handleTeamCreated = async () => {
    setIsRefreshing(true);
    
    try {
      // チーム一覧を取得
      const teamsResponse = await fetch('/api/teams');
      if (!teamsResponse.ok) {
        throw new Error('チーム一覧の取得に失敗しました');
      }
      
      const teamsData = await teamsResponse.json();
      const newTeams = teamsData.teams || [];
      console.log('取得したチーム数:', newTeams.length);
      
      // 各チームのメンバーを取得
      const teamsWithMembers = await Promise.all(
        newTeams.map(async (team: Team) => {
          try {
            const membersResponse = await fetch(`/api/teams/${team.id}/members`);
            if (!membersResponse.ok) {
              console.error(`チーム ${team.id} のメンバー取得に失敗: ${membersResponse.status}`);
              return { ...team, members: [] };
            }
            
            const membersData = await membersResponse.json();
            console.log(`チーム ${team.id} のメンバー数:`, membersData.members?.length || 0);
            
            return {
              ...team,
              members: membersData.members || []
            };
          } catch (error) {
            console.error(`チーム ${team.id} のメンバー取得に失敗:`, error);
            return { ...team, members: [] };
          }
        })
      );
      
      setTeams(teamsWithMembers);
      console.log('チームとメンバーの取得が完了しました');
    } catch (error) {
      console.error('チーム一覧の更新に失敗しました:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 検索フィルター
  const filterMember = (member: TeamMember) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      member.profiles.full_name?.toLowerCase().includes(query) ||
      member.profiles.email?.toLowerCase().includes(query)
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">チーム</h1>
      </div>


      <div className="mb-4 flex items-center gap-2">
        <CreateTeamDialog onTeamCreated={handleTeamCreated} />
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input 
            className="w-64 pl-9" 
            placeholder="名前またはメールで検索" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="p-4 text-center text-gray-500 border rounded-md">
          チームがありません
        </div>
      ) : (
        teams.map((team) => (
          <div key={team.id} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{team.name}</h2>
                {isCurrentUserAdmin(team) && (
                  <span className="rounded-sm bg-blue-500 px-2 py-0.5 text-xs text-white">
                    あなたは管理者です
                  </span>
                )}
              </div>
              {isCurrentUserAdmin(team) && (
                <div className="flex items-center gap-2">
                  <EditTeamDialog 
                    team={team} 
                    onTeamUpdated={handleTeamCreated} 
                  />
                  <DeleteTeamDialog 
                    teamId={team.id} 
                    teamName={team.name} 
                    onTeamDeleted={handleTeamCreated} 
                  />
                </div>
              )}
            </div>
            
            <div className="rounded-md border">
              <div className="border-b bg-gray-50 p-3 text-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>メンバー</span>
                  {isCurrentUserAdmin(team) && (
                    <span className="text-xs text-gray-500">
                      (管理者はメンバーの追加・削除・役割変更ができます)
                    </span>
                  )}
                </div>
                {isCurrentUserAdmin(team) && (
                  <AddMemberDialog 
                    teamId={team.id} 
                    teamName={team.name} 
                    onMemberAdded={handleTeamCreated} 
                  />
                )}
              </div>
              <div className="grid grid-cols-4 border-b bg-gray-50 p-3 text-sm">
                <div className="font-medium">名前</div>
                <div className="font-medium">メール</div>
                <div className="font-medium">役割</div>
                <div className="font-medium text-right">アクション</div>
              </div>
              
              {!team.members || team.members.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  チームメンバーがありません
                </div>
              ) : team.members.filter(filterMember).length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  検索結果がありません
                </div>
              ) : (
                team.members.filter(filterMember).map((member) => (
                  <div key={member.id} className="grid grid-cols-4 border-b p-3">
                    <div>{member.profiles.full_name}</div>
                    <div>{member.profiles.email}</div>
                    <div>{member.role === 'admin' ? '管理者' : member.role === 'member' ? 'メンバー' : '--'}</div>
                    <div className="text-right">
                      <MemberActions 
                        member={member} 
                        teamId={team.id} 
                        isCurrentUserAdmin={isCurrentUserAdmin(team)} 
                        onMemberUpdated={handleTeamCreated} 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
