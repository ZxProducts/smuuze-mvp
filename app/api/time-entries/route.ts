import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// タイムエントリーの取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーを取得（より安全な方法）
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // タイムエントリーを取得するクエリを構築
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        projects:project_id (
          id,
          name
        ),
        tasks:task_id (
          id,
          title
        )
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
    
    // フィルタリング条件を追加
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    
    if (endDate) {
      // 終了日が指定された場合、以下のいずれかの条件を満たすタイムエントリーを取得
      // 1. 開始時間が終了日以前
      // 2. 終了時間が指定されていない（進行中）
      // 3. 終了時間が開始日以降
      query = query.or(`start_time.lte.${endDate},end_time.is.null,end_time.gte.${startDate}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ timeEntries: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タイムエントリーの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// タイムエントリーの作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーを取得（より安全な方法）
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // リクエストボディを取得
    const { description, projectId, taskId, startTime, endTime, breakMinutes } = await request.json();
    
    if (!projectId || !startTime || !taskId) {
      return NextResponse.json(
        { error: 'プロジェクトID、タスクIDと開始時間は必須です' },
        { status: 400 }
      );
    }
    
    // タスクがユーザーに割り当てられているか確認
    const { data: taskAssignees, error: taskAssigneeError } = await supabase
      .from('task_assignees')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId);
    
    if (taskAssigneeError) {
      return NextResponse.json(
        { error: taskAssigneeError.message },
        { status: 400 }
      );
    }
    
    if (!taskAssignees || taskAssignees.length === 0) {
      // ユーザーがタスクの組織に所属しているか確認
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('team_id')
        .eq('id', taskId)
        .single();
      
      if (taskError) {
        return NextResponse.json(
          { error: 'タスクが見つかりません' },
          { status: 404 }
        );
      }
      
      const { data: teamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', task.team_id)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (teamMemberError || !teamMember) {
        return NextResponse.json(
          { error: 'このタスクにアクセスする権限がありません' },
          { status: 403 }
        );
      }
    }
    
    // タイムエントリーを作成
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        project_id: projectId,
        task_id: taskId,
        start_time: startTime,
        end_time: endTime || null,
        break_minutes: breakMinutes || 0,
        description: description || null,
      })
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ timeEntry: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タイムエントリーの作成に失敗しました' },
      { status: 500 }
    );
  }
}
