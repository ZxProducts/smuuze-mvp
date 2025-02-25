import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import {
  ErrorResponse,
  ApiResponse,
  ProjectResponse
} from '@/types/api';

export const dynamic = 'force-dynamic';

// プロジェクト詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = (await params).id;

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

    // プロジェクト情報を取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        tasks (
          id,
          title,
          description,
          due_date,
          created_at,
          updated_at,
          assignees:task_assignees (
            profile:profiles (
              id,
              full_name,
              email,
              created_at,
              updated_at
            )
          )
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('プロジェクト情報取得エラー:', projectError);
      const errorResponse: ErrorResponse = {
        error: 'プロジェクト情報の取得に失敗しました',
        status: 500,
        details: projectError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // プロジェクトの作業時間を取得
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select(`
        id,
        start_time,
        end_time,
        project_id,
        user_id,
        task_id,
        task:tasks (
          id,
          title
        ),
        profile:profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('project_id', projectId);

    if (timeEntriesError) {
      console.error('作業時間取得エラー:', timeEntriesError);
      const errorResponse: ErrorResponse = {
        error: '作業時間の取得に失敗しました',
        status: 500,
        details: timeEntriesError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // レスポンスデータの整形
    const formattedProject = {
      ...project,
      tasks: project.tasks.map((task: any) => ({
        ...task,
        assignees: task.assignees.map((assignee: any) => assignee.profile)
      })),
      timeEntries
    };

    const response: ApiResponse<ProjectResponse> = {
      data: formattedProject
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('プロジェクト詳細取得処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}