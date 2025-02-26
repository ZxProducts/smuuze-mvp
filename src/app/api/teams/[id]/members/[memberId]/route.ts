import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';

export const dynamic = 'force-dynamic';

interface DeleteMemberResponse {
  message: string;
}

interface ErrorResponse {
  error: string;
}

// チームメンバーを削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  const params = await context.params;
  const teamId = params.id;
  const memberId = params.memberId;

  try {
    const supabase = await createClient();

    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です'
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // チーム管理者権限を確認
    const { data: memberRole } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!memberRole || memberRole.role !== 'admin') {
      const errorResponse: ErrorResponse = {
        error: 'チーム管理者権限が必要です'
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // メンバーを削除
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('メンバー削除エラー:', deleteError);
      const errorResponse: ErrorResponse = {
        error: 'メンバーの削除に失敗しました'
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const response: DeleteMemberResponse = {
      message: 'メンバーを削除しました'
    };
    return NextResponse.json(response);

  } catch (error) {
    console.error('メンバー削除処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました'
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}