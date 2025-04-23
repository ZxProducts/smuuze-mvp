import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// タスクの取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーのセッションを取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const teamId = searchParams.get('teamId');
    const assignedToMe = searchParams.get('assignedToMe') === 'true';
    
    // ユーザーが所属する組織を取得
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);
    
    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
        { status: 400 }
      );
    }
    
    // ユーザーが所属する組織のIDを抽出
    const teamIds = teamMembers.map(member => member.team_id);
    
    if (teamIds.length === 0) {
      return NextResponse.json({ tasks: [] });
    }
    
    // タスクを取得するクエリを構築
    let query = supabase
      .from('tasks')
      .select(`
        *,
        projects:project_id (
          id,
          name
        ),
        task_assignees!inner (
          id,
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        )
      `)
      .in('team_id', teamIds);
    
    // 自分に割り当てられたタスクのみを取得する場合
    if (assignedToMe) {
      query = query.filter('task_assignees.user_id', 'eq', userId);
    }
    
    // フィルタリング条件を追加
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ tasks: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タスクの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// タスクの作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーのセッションを取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // リクエストボディを取得
    const { title, description, projectId, assigneeIds, dueDate } = await request.json();
    
    if (!title || !projectId) {
      return NextResponse.json(
        { error: 'タイトルとプロジェクトIDは必須です' },
        { status: 400 }
      );
    }
    
    // プロジェクトを取得して組織IDを取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      return NextResponse.json(
        { error: projectError.message },
        { status: 400 }
      );
    }
    
    const teamId = project.team_id;
    
    // ユーザーが組織の管理者かどうかを確認
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();
    
    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'この組織にアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'タスクを作成する権限がありません' },
        { status: 403 }
      );
    }
    
    // タスクを作成
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        project_id: projectId,
        team_id: teamId,
        due_date: dueDate || null,
      })
      .select()
      .single();
    
    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 400 }
      );
    }
    
    // アサインするユーザーがいる場合は、プロジェクトメンバーかどうかを確認してからタスクアサインを作成
    if (assigneeIds && assigneeIds.length > 0) {
      // プロジェクトメンバーを取得
      const { data: projectMembers, error: projectMembersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);
      
      if (projectMembersError) {
        return NextResponse.json(
          { error: projectMembersError.message },
          { status: 400 }
        );
      }
      
      // プロジェクトメンバーのユーザーIDを抽出
      const projectMemberUserIds = projectMembers.map((member: any) => member.user_id);
      
      // アサインするユーザーがプロジェクトメンバーかどうかをチェック
      const invalidAssignees = assigneeIds.filter(
        (assigneeId: string) => !projectMemberUserIds.includes(assigneeId)
      );
      
      if (invalidAssignees.length > 0) {
        return NextResponse.json(
          { error: 'プロジェクトメンバーではないユーザーをタスクに割り当てることはできません' },
          { status: 400 }
        );
      }
      
      // タスクアサインを作成
      const assignees = assigneeIds.map((assigneeId: string) => ({
        task_id: task.id,
        user_id: assigneeId,
      }));
      
      const { error: assignError } = await supabase
        .from('task_assignees')
        .insert(assignees);
      
      if (assignError) {
        return NextResponse.json(
          { error: assignError.message },
          { status: 400 }
        );
      }
    }
    
    // タスク履歴を記録
    await supabase
      .from('task_history')
      .insert({
        task_id: task.id,
        changed_by: userId,
        change_type: 'update',
        old_value: null,
        new_value: {
          title,
          description: description || null,
          project_id: projectId,
          team_id: teamId,
          due_date: dueDate || null,
        },
        change_reason: 'タスク作成',
      });
    
    return NextResponse.json({ task });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タスクの作成に失敗しました' },
      { status: 500 }
    );
  }
}
