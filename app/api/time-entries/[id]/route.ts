import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// タイムエントリーの取得（単一）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const entryId = params.id;
    
    // タイムエントリーを取得
    const { data, error } = await supabase
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
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ timeEntry: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タイムエントリーの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// タイムエントリーの更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const entryId = params.id;
    
    // リクエストボディを取得
    const { description, projectId, taskId, startTime, endTime, breakMinutes } = await request.json();
    
    // タスクIDが削除されていないか確認
    if (taskId === null) {
      return NextResponse.json(
        { error: 'タスクIDは必須です' },
        { status: 400 }
      );
    }
    
    // 更新するフィールドを準備
    const updateFields: any = {};
    
    if (description !== undefined) updateFields.description = description;
    if (projectId !== undefined) updateFields.project_id = projectId;
    if (taskId !== undefined) {
      // タスクIDが変更された場合、ユーザーがそのタスクにアクセスできるか確認
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
      
      updateFields.task_id = taskId;
    }
    
    if (startTime !== undefined) updateFields.start_time = startTime;
    if (endTime !== undefined) updateFields.end_time = endTime;
    if (breakMinutes !== undefined) updateFields.break_minutes = breakMinutes;
    
    // タイムエントリーを更新
    const { data, error } = await supabase
      .from('time_entries')
      .update(updateFields)
      .eq('id', entryId)
      .eq('user_id', userId)
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'タイムエントリーが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ timeEntry: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タイムエントリーの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// タイムエントリーの削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const entryId = params.id;
    
    // タイムエントリーを削除
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タイムエントリーの削除に失敗しました' },
      { status: 500 }
    );
  }
}
