import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { get } from "@/lib/api"
import { TeamContent } from "./team-content"

export const dynamic = 'force-dynamic';

// 組織メンバーの型定義
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

// 組織の型定義
interface Team {
  id: string;
  name: string;
  created_at: string;
  members?: TeamMember[];
}

// APIレスポンスの型定義
interface TeamsResponse {
  teams: Team[];
}

interface TeamMembersResponse {
  members: TeamMember[];
}

// サーバーコンポーネントで組織一覧を取得
async function getTeams(): Promise<Team[]> {
  try {
    // 共通API関数を使用して組織一覧を取得
    const teamsData = await get<TeamsResponse>('/api/teams');
    return teamsData.teams || [];
  } catch (error) {
    console.error('組織一覧の取得に失敗しました:', error);
    return [];
  }
}

// サーバーコンポーネントで特定組織のメンバー一覧を取得
async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    if (!teamId) return [];
    
    const membersData = await get<TeamMembersResponse>(`/api/teams/${teamId}/members`);
    return membersData.members || [];
  } catch (error) {
    console.error('組織メンバーの取得に失敗しました:', error);
    return [];
  }
}

// サーバーコンポーネントで全組織とそのメンバーを取得
async function getAllTeamsWithMembers(): Promise<Team[]> {
  try {
    // 組織一覧を取得
    const teams = await getTeams();
    
    // 各組織のメンバーを取得
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await getTeamMembers(team.id);
        return {
          ...team,
          members
        };
      })
    );
    
    return teamsWithMembers;
  } catch (error) {
    console.error('組織とメンバーの取得に失敗しました:', error);
    return [];
  }
}

export default async function TeamPage() {
  // 全組織とそのメンバーを取得
  const teamsWithMembers = await getAllTeamsWithMembers();
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="team" />
        <div className="flex-1 p-6">
          <TeamContent teamsWithMembers={teamsWithMembers} />
        </div>
      </div>
    </div>
  )
}
