import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import { ErrorResponse, ApiResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

// タスクの担当者を更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const taskId = (await context.params).taskId;
    const { assigneeIds } = await request.json();

    if (!Array.isArray(assigneeIds)) {
      const errorResponse: ErrorResponse = {
        error: '担当者IDの配列が必要です',
        status: 400
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

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

    // タスクの存在確認
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, team_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      const errorResponse: ErrorResponse = {
        error: 'タスクが見つかりません',
        status: 404
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // 現在の担当者を取得（変更履歴用）
    const { data: currentAssignees } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId);

    const oldAssigneeIds = currentAssignees?.map(a => a.user_id) || [];

    // 追加・削除が必要な担当者を特定
    const assigneesToAdd = assigneeIds.filter(id => !oldAssigneeIds.includes(id));
    const assigneesToRemove = oldAssigneeIds.filter(id => !assigneeIds.includes(id));

    // 削除対象の担当者を削除
    if (assigneesToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .in('user_id', assigneesToRemove);

      if (deleteError) {
        console.error('担当者削除エラー:', deleteError);
        const errorResponse: ErrorResponse = {
          error: '担当者の削除に失敗しました',
          status: 500,
          details: deleteError
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }
    }

    // 新しい担当者を追加
    if (assigneesToAdd.length > 0) {
      const assigneeRecords = assigneesToAdd.map(userId => ({
        task_id: taskId,
        user_id: userId,
        assigned_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('task_assignees')
        .upsert(assigneeRecords, {
          onConflict: 'task_id,user_id',
          ignoreDuplicates: true
        });

      if (insertError) {
        console.error('担当者追加エラー:', insertError);
        const errorResponse: ErrorResponse = {
          error: '担当者の追加に失敗しました',
          status: 500,
          details: insertError
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }
    }

    // 変更履歴を記録
    const { error: historyError } = await supabase
      .from('task_history')
      .insert({
        task_id: taskId,
        changed_by: user.id,
        change_type: 'assignment_change',
        old_value: { assignees: oldAssigneeIds },
        new_value: { assignees: assigneeIds }
      });

    if (historyError) {
      console.error('変更履歴記録エラー:', historyError);
      // 履歴の記録に失敗しても、担当者の更新自体は成功しているため、
      // エラーレスポンスは返さずに警告のみ出力
      console.warn('変更履歴の記録に失敗しました');
    }

    const response: ApiResponse<{ message: string }> = {
      data: {
        message: '担当者を更新しました'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('タスク担当者更新処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}