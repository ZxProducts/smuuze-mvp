import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// タスクの取得（単一）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const taskId = params.id;
    
    // タスクを取得
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        projects:project_id (
          id,
          name
        ),
        task_assignees (
          id,
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        ),
        task_comments (
          id,
          comment,
          created_at,
          author:author_id (
            id,
            full_name
          )
        ),
        task_history (
          id,
          change_type,
          old_value,
          new_value,
          change_reason,
          changed_at,
          changed_by_user:changed_by (
            id,
            full_name
          )
        )
      `)
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがタスクのチームに所属しているか確認
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', task.team_id)
      .maybeSingle();
    
    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
        { status: 400 }
      );
    }
    
    if (!teamMember) {
      return NextResponse.json(
        { error: 'このタスクにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ task });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タスクの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// タスクの更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const taskId = params.id;
    
    // タスクを取得
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがチームの管理者かどうかを確認
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', task.team_id)
      .single();
    
    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'タスクを更新する権限がありません' },
        { status: 403 }
      );
    }
    
    // リクエストボディを取得
    const { title, description, projectId, assigneeIds, dueDate } = await request.json();
    
    // 更新するフィールドを準備
    const updateFields: any = {};
    
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (projectId !== undefined) updateFields.project_id = projectId;
    if (dueDate !== undefined) updateFields.due_date = dueDate;
    
    // プロジェクトIDが変更された場合、新しいプロジェクトのチームIDを取得
    if (projectId !== undefined && projectId !== task.project_id) {
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
      
      updateFields.team_id = project.team_id;
    }
    
    // タスク履歴を記録
    await supabase
      .from('task_history')
      .insert({
        task_id: taskId,
        changed_by: userId,
        change_type: 'update',
        old_value: task,
        new_value: { ...task, ...updateFields },
        change_reason: 'タスク更新',
      });
    
    // タスクを更新
    const { data, error } = await supabase
      .from('tasks')
      .update(updateFields)
      .eq('id', taskId)
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // アサインするユーザーが指定された場合
    if (assigneeIds !== undefined) {
      // 現在のプロジェクトID（更新後のプロジェクトIDがあればそれを使用）
      const currentProjectId = projectId !== undefined ? projectId : task.project_id;
      
      // プロジェクトメンバーを取得
      const { data: projectMembers, error: projectMembersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', currentProjectId);
      
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
      
      // 現在のアサインを削除
      await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);
      
      // 新しいアサインを作成
      if (assigneeIds.length > 0) {
        const assignees = assigneeIds.map((assigneeId: string) => ({
          task_id: taskId,
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
    }
    
    return NextResponse.json({ task: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タスクの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// タスクの削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const taskId = params.id;
    
    // タスクを取得
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('team_id')
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがチームの管理者かどうかを確認
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', task.team_id)
      .single();
    
    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'タスクを削除する権限がありません' },
        { status: 403 }
      );
    }
    
    // タスクを削除
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タスクの削除に失敗しました' },
      { status: 500 }
    );
  }
}
