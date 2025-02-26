import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import { Project, ErrorResponse, ApiResponse } from '@/types/api';

// 常に最新のデータを取得するように設定
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です',
        status: 401
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // プロジェクトとタスク数を取得
    let query = supabase
      .from('projects')
      .select(`
        *,
        tasks:tasks(count)
      `);

    // チームIDでフィルタリング
    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    // タスク数を含むレスポンスデータを作成
    const projectsWithStats = data?.map(project => ({
      ...project,
      tasks: {
        total: project.tasks?.[0]?.count || 0
      }
    })) || [];

    if (error) {
      console.error('プロジェクト一覧取得エラー:', error);
      const errorResponse: ErrorResponse = {
        error: 'プロジェクト一覧の取得に失敗しました',
        status: 500,
        details: error
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const response: ApiResponse<Project[]> = {
      data: projectsWithStats
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('予期しないエラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}