import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { get } from "@/lib/api"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

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
  description?: string;
  created_at: string;
  members?: TeamMember[];
}

// APIレスポンスの型定義
interface TeamResponse {
  team: Team;
}

interface TeamMembersResponse {
  members: TeamMember[];
}

// サーバーコンポーネントで特定の組織情報を取得
async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const teamData = await get<TeamResponse>(`/api/teams/${teamId}`);
    return teamData.team || null;
  } catch (error) {
    console.error('組織情報の取得に失敗しました:', error);
    return null;
  }
}

// サーバーコンポーネントで特定組織のメンバー一覧を取得
async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    const membersData = await get<TeamMembersResponse>(`/api/teams/${teamId}/members`);
    return membersData.members || [];
  } catch (error) {
    console.error('組織メンバーの取得に失敗しました:', error);
    return [];
  }
}

interface TeamPageProps {
  params: { teamId: string };
  searchParams: { welcome?: string };
}

export default async function TeamDetailPage({ params, searchParams }: TeamPageProps) {
  const { teamId } = params;
  const { welcome } = searchParams;
  
  // 組織情報を取得
  const team = await getTeam(teamId);
  
  if (!team) {
    notFound();
  }
  
  // 組織のメンバーを取得
  const members = await getTeamMembers(teamId);
  const teamWithMembers = { ...team, members };
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="team" />
        <div className="flex-1 p-6">
          {welcome && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                🎉 {team.name}へようこそ！
              </h2>
              <p className="text-green-700">
                招待が正常に完了しました。チームメンバーとして追加されました。
              </p>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
              {team.description && (
                <p className="mt-2 text-lg text-gray-600">{team.description}</p>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                チームメンバー ({members.length}人)
              </h2>
              
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {members.map((member) => (
                    <li key={member.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.profiles.full_name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.profiles.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.profiles.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {member.role}
                          </span>
                          <div className="ml-4 text-sm text-gray-500">
                            参加日: {new Date(member.joined_at).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              {members.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">まだメンバーがいません</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-4">
              <Link
                href="/team"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                チーム一覧に戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 