import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import { TeamMemberActivity, ErrorResponse, ApiResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

// 作業時間を "HH:MM:SS" 形式に変換する関数
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:00`;
}

type DbMember = {
  profile: {
    id: string;
    full_name: string;
  };
};

type DbTimeEntry = {
  start_time: string;
  end_time: string | null;
  description: string | null;
  projects: {
    name: string;
  } | null;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です',
        status: 401
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // ユーザーのチームメンバー情報を取得（最初のチームを使用）
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1);

    if (memberError || !memberTeams || memberTeams.length === 0) {
      console.error('チームメンバー情報取得エラー:', memberError);
      const errorResponse: ErrorResponse = {
        error: 'チーム情報の取得に失敗しました',
        status: 500,
        details: memberError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // チームメンバー一覧を取得
    const { data: members, error: teamError } = await supabase
      .from('team_members')
      .select(`
        profile:profiles!inner(
          id,
          full_name
        )
      `)
      .eq('team_id', memberTeams[0].team_id);

    if (teamError || !members) {
      console.error('チームメンバー一覧取得エラー:', teamError);
      const errorResponse: ErrorResponse = {
        error: 'チームメンバー情報の取得に失敗しました',
        status: 500,
        details: teamError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // 各メンバーの作業時間と最新アクティビティを取得
    const memberActivities = await Promise.all(
      (members as unknown as DbMember[]).map(async (member) => {
        const { profile } = member;
        
        // 作業時間を取得（過去1年）
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data: timeEntries, error: timeError } = await supabase
          .from('time_entries')
          .select(`
            start_time,
            end_time,
            description,
            projects(
              name
            )
          `)
          .eq('user_id', profile.id)
          .gte('start_time', oneYearAgo.toISOString())
          .order('start_time', { ascending: false });

        if (timeError || !timeEntries) {
          console.error('作業時間取得エラー:', timeError);
          return null;
        }

        // 総作業時間を計算
        let totalMinutes = 0;
        (timeEntries as unknown as DbTimeEntry[]).forEach(entry => {
          if (!entry.end_time) return;
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time);
          totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
        });

        // 最新のアクティビティを取得
        const latestEntry = timeEntries[0] as unknown as DbTimeEntry;
        const activityInfo = latestEntry ? {
          project_name: latestEntry.projects?.name || '不明なプロジェクト',
          description: latestEntry.description || '作業内容なし',
          timestamp: latestEntry.start_time,
        } : null;

        const activity: TeamMemberActivity = {
          id: profile.id,
          full_name: profile.full_name,
          latest_activity: activityInfo,
          total_time: formatDuration(totalMinutes),
          time_percentage: Math.min((totalMinutes / (8 * 60 * 20)) * 100, 100), // 1ヶ月の想定作業時間（8時間/日 × 20日）を基準に
        };

        return activity;
      })
    );

    // nullを除外してフィルタリング
    const filteredActivities = memberActivities.filter((activity): activity is TeamMemberActivity => activity !== null);

    const response: ApiResponse<TeamMemberActivity[]> = {
      data: filteredActivities
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('チームアクティビティ取得エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}