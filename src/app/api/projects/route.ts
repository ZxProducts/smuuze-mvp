import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import {
  ProjectResponse,
  ErrorResponse,
  ApiResponse
} from '@/types/api';

export const dynamic = 'force-dynamic';

// プロジェクト一覧取得
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

    // ユーザーが所属するチームのIDを取得
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('チームメンバー情報取得エラー:', memberError);
      const errorResponse: ErrorResponse = {
        error: 'チーム情報の取得に失敗しました',
        status: 500,
        details: memberError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const teamIds = memberTeams.map(mt => mt.team_id);

    // プロジェクト情報を取得
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        tasks (
          id
        )
      `)
      .in('team_id', teamIds);

    if (projectsError) {
      console.error('プロジェクト情報取得エラー:', projectsError);
      const errorResponse: ErrorResponse = {
        error: 'プロジェクト情報の取得に失敗しました',
        status: 500,
        details: projectsError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // プロジェクトごとのタスク統計を計算
    const projectsWithStats = projects.map(project => {
      const tasks = {
        total: project.tasks.length
      };

      // tasksプロパティを削除（統計情報に変換済みのため）
      const { tasks: _, ...projectWithoutTasks } = project;

      return {
        ...projectWithoutTasks,
        tasks
      };
    });

    const response: ApiResponse<ProjectResponse[]> = {
      data: projectsWithStats
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('プロジェクト一覧取得処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}