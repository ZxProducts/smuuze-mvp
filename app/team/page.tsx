import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { get } from "@/lib/api"
import { TeamContent } from "./team-content"

export const dynamic = 'force-dynamic';

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

// APIレスポンスの型定義
interface TeamsResponse {
  teams: Team[];
}

interface TeamMembersResponse {
  members: TeamMember[];
}

// サーバーコンポーネントでチーム一覧を取得
async function getTeams(): Promise<Team[]> {
  try {
    // 共通API関数を使用してチーム一覧を取得
    const teamsData = await get<TeamsResponse>('/api/teams');
    return teamsData.teams || [];
  } catch (error) {
    console.error('チーム一覧の取得に失敗しました:', error);
    return [];
  }
}

// サーバーコンポーネントで特定チームのメンバー一覧を取得
async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    if (!teamId) return [];
    
    const membersData = await get<TeamMembersResponse>(`/api/teams/${teamId}/members`);
    return membersData.members || [];
  } catch (error) {
    console.error('チームメンバーの取得に失敗しました:', error);
    return [];
  }
}

// サーバーコンポーネントで全チームとそのメンバーを取得
async function getAllTeamsWithMembers(): Promise<Team[]> {
  try {
    // チーム一覧を取得
    const teams = await getTeams();
    
    // 各チームのメンバーを取得
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
    console.error('チームとメンバーの取得に失敗しました:', error);
    return [];
  }
}

export default async function TeamPage() {
  // 全チームとそのメンバーを取得
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
