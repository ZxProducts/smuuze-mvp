import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import { TimeStats, ErrorResponse, ApiResponse } from '@/types/api';

// 常に最新のデータを取得するように設定
export const dynamic = 'force-dynamic';

// 作業時間を "HH:MM:SS" 形式に変換する関数
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:00`;
}

interface TimeEntry {
  start_time: string;
  end_time: string | null;
}

interface RawProjectTimeEntry {
  start_time: string;
  end_time: string | null;
  project: {
    id: string;
    name: string;
    team_id: string;
  }[];
}

interface ProjectTimeEntry {
  start_time: string;
  end_time: string | null;
  project: {
    id: string;
    name: string;
    team_id: string;
  };
}

// 統計情報を取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{}> }
) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');
    const projectId = searchParams.get('projectId');

    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です',
        status: 401
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // チームIDが指定されている場合、メンバーシップを確認
    if (teamId) {
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        const errorResponse: ErrorResponse = {
          error: '指定されたチームへのアクセス権限がありません',
          status: 403
        };
        return NextResponse.json(errorResponse, { status: 403 });
      }
    }

    // プロジェクトIDのリストを取得（チームIDが指定されている場合）
    let projectIds: string[] = [];
    if (teamId) {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('team_id', teamId);
      
      if (projectsData) {
        projectIds = projectsData.map(p => p.id);
      }
    }

    // クエリの構築
    let query = supabase
      .from('time_entries')
      .select('start_time, end_time')
      .not('end_time', 'is', null);

    // フィルター条件の追加
    if (projectId) {
      query = query.eq('project_id', projectId);
    } else if (teamId && projectIds.length > 0) {
      query = query.in('project_id', projectIds);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: totalTimeData, error: totalTimeError } = await query;

    if (totalTimeError) {
      console.error('作業時間取得エラー:', totalTimeError);
      const errorResponse: ErrorResponse = {
        error: '作業時間の取得に失敗しました',
        status: 500,
        details: totalTimeError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // プロジェクトごとの作業時間を集計
    let projectQuery = supabase
      .from('time_entries')
      .select(`start_time, end_time, project:projects(id, name, team_id)`)
      .not('end_time', 'is', null);

    // フィルター条件の追加
    if (projectId) {
      projectQuery = projectQuery.eq('project_id', projectId);
    } else if (teamId && projectIds.length > 0) {
      projectQuery = projectQuery.in('project_id', projectIds);
    } else {
      projectQuery = projectQuery.eq('user_id', user.id);
    }

    const { data: rawProjectTimeData, error: projectTimeError } = await projectQuery;

    if (projectTimeError) {
      console.error('プロジェクト別作業時間取得エラー:', projectTimeError);
      const errorResponse: ErrorResponse = {
        error: 'プロジェクト別作業時間の取得に失敗しました',
        status: 500,
        details: projectTimeError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // 総作業時間を計算（分単位）
    let totalMinutes = 0;
    (totalTimeData as TimeEntry[]).forEach(entry => {
      if (!entry.end_time) return;
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
    });

    // プロジェクトごとの作業時間を集計
    const projectTimes = new Map<string, { name: string; minutes: number }>();
    (rawProjectTimeData as RawProjectTimeEntry[]).forEach(entry => {
      if (!entry.project?.[0] || !entry.end_time) return;
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const project = entry.project[0];
      const current = projectTimes.get(project.id) || { name: project.name, minutes: 0 };
      current.minutes += minutes;
      projectTimes.set(project.id, current);
    });

    // プロジェクト配列にソートして変換
    const sortedProjects = Array.from(projectTimes.entries())
      .map(([id, { name, minutes }]) => ({
        project_id: id,
        project_name: name,
        time: formatDuration(minutes),
        percentage: (minutes / totalMinutes) * 100,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // 月ごとの集計
    const monthlyData = new Map<number, {
      totalMinutes: number;
      projectMinutes: Map<string, { minutes: number; name: string }>;
    }>();

    (rawProjectTimeData as RawProjectTimeEntry[]).forEach(entry => {
      if (!entry.project?.[0] || !entry.end_time) return;
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const month = start.getMonth() + 1;  // 1-12の月
      const project = entry.project[0];

      const monthData = monthlyData.get(month) || {
        totalMinutes: 0,
        projectMinutes: new Map(),
      };
      monthData.totalMinutes += minutes;

      const projectData = monthData.projectMinutes.get(project.id) || {
        minutes: 0,
        name: project.name,
      };
      projectData.minutes += minutes;
      monthData.projectMinutes.set(project.id, projectData);
      monthlyData.set(month, monthData);
    });

    // 月ごとのデータを配列に変換
    const monthlyDistribution = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        totalTime: formatDuration(data.totalMinutes),
        byProject: Array.from(data.projectMinutes.entries()).map(([id, { minutes, name }]) => ({
          project_id: id,
          project_name: name,
          time: formatDuration(minutes),
        })),
      }))
      .sort((a, b) => a.month - b.month);

    // トッププロジェクトを取得
    const topProject = sortedProjects[0] || { project_name: '—', time: '00:00:00' };

    const stats: TimeStats = {
      totalTime: formatDuration(totalMinutes),
      topProject: {
        name: topProject.project_name,
        time: topProject.time,
      },
      monthlyDistribution,
      projectDistribution: sortedProjects,
    };

    const response: ApiResponse<TimeStats> = {
      data: stats
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('統計情報取得エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}