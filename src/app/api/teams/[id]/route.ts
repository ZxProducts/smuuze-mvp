import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import {
  TeamResponse,
  UpdateTeamRequest,
  ErrorResponse,
  ApiResponse,
  MessageResponse
} from '@/types/api';

export const dynamic = 'force-dynamic';

// チーム情報取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です',
        status: 401
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // チームへのアクセス権を確認
    const { data: memberCheck } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', id)
      .eq('user_id', user.id)
      .single();

    if (!memberCheck) {
      const errorResponse: ErrorResponse = {
        error: 'このチームへのアクセス権がありません',
        status: 403
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // チーム情報を取得
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          *,
          profile:profiles(*)
        ),
        offers(*)
      `)
      .eq('id', id)
      .single();

    if (teamError) {
      console.error('チーム情報取得エラー:', teamError);
      const errorResponse: ErrorResponse = {
        error: 'チーム情報の取得に失敗しました',
        status: 500,
        details: teamError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const response: ApiResponse<TeamResponse> = {
      data: team
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('チーム取得処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// チーム情報更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;
    const updates: UpdateTeamRequest = await request.json();

    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です',
        status: 401
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // 管理者権限を確認
    const { data: memberCheck } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', id)
      .eq('user_id', user.id)
      .single();

    if (!memberCheck || memberCheck.role !== 'admin') {
      const errorResponse: ErrorResponse = {
        error: 'チーム管理者権限が必要です',
        status: 403
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // チーム情報を更新
    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        members:team_members(
          *,
          profile:profiles(*)
        ),
        offers(*)
      `)
      .single();

    if (updateError) {
      console.error('チーム更新エラー:', updateError);
      const errorResponse: ErrorResponse = {
        error: 'チームの更新に失敗しました',
        status: 500,
        details: updateError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const response: ApiResponse<TeamResponse> = {
      data: team
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('チーム更新処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// チーム削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です',
        status: 401
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // 管理者権限を確認
    const { data: memberCheck } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', id)
      .eq('user_id', user.id)
      .single();

    if (!memberCheck || memberCheck.role !== 'admin') {
      const errorResponse: ErrorResponse = {
        error: 'チーム管理者権限が必要です',
        status: 403
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // チームを削除
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('チーム削除エラー:', deleteError);
      const errorResponse: ErrorResponse = {
        error: 'チームの削除に失敗しました',
        status: 500,
        details: deleteError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const response: ApiResponse<MessageResponse> = {
      data: { message: 'チームを削除しました' }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('チーム削除処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}