import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import { ApiResponse, ErrorResponse, OfferResponse, TeamMember } from '@/types/api';
import { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const teamId = (await params).id;

  try {
    const supabase = await createClient();
    const data = await request.json();

    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です',
        status: 401
      };
      return NextResponse.json({ error: errorResponse }, { status: 401 });
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
        error: 'チーム管理者権限が必要です',
        status: 403
      };
      return NextResponse.json({ error: errorResponse }, { status: 403 });
    }

    // ユーザー検索と招待処理
    const { data: existingUser, error: searchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', data.email)
      .single();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116はレコードが見つからない場合のエラー
      console.error('ユーザー検索エラー:', searchError);
      const errorResponse: ErrorResponse = {
        error: 'ユーザー検索に失敗しました',
        status: 500
      };
      return NextResponse.json({ error: errorResponse }, { status: 500 });
    }

    if (existingUser) {
      // 既存メンバーのチェック
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (memberCheckError && memberCheckError.code !== 'PGRST116') {
        console.error('メンバーチェックエラー:', {
          error: memberCheckError,
          teamId,
          userId: existingUser.id
        });
        const errorResponse: ErrorResponse = {
          error: 'メンバーの確認中にエラーが発生しました',
          status: 500
        };
        return NextResponse.json({ error: errorResponse }, { status: 500 });
      }

      if (existingMember) {
        const errorResponse: ErrorResponse = {
          error: 'このユーザーは既にチームのメンバーです',
          status: 400
        };
        return NextResponse.json({ error: errorResponse }, { status: 400 });
      }

      // 既存ユーザーをチームに追加
      const { data: newMember, error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: existingUser.id,
          role: 'member',
          hourly_rate: data.hourly_rate,
          daily_work_hours: data.daily_work_hours,
          weekly_work_days: data.weekly_work_days,
          meeting_included: data.meeting_included,
          notes: data.notes
        });

      if (memberError) {
        console.error('メンバー追加エラー:', {
          error: memberError,
          teamId,
          userId: existingUser.id,
          code: memberError.code
        });

        const errorResponse: ErrorResponse = {
          error: 'メンバー追加でエラーが発生しました',
          status: 500
        };
        return NextResponse.json({ error: errorResponse }, { status: 500 });
      }

      const response: ApiResponse<OfferResponse> = {
        data: {
          id: crypto.randomUUID(),
          team_id: teamId,
          email: data.email,
          hourly_rate: data.hourly_rate,
          daily_work_hours: data.daily_work_hours,
          weekly_work_days: data.weekly_work_days,
          meeting_included: data.meeting_included,
          notes: data.notes,
          status: 'accepted',
          token: '',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message: 'メンバーを追加しました'
        }
      };
      return NextResponse.json(response);

    } else {
      // 新規ユーザーを招待
      const { error: offerError } = await supabase
        .from('offers')
        .insert({
          team_id: teamId,
          email: data.email,
          hourly_rate: data.hourly_rate,
          daily_work_hours: data.daily_work_hours,
          weekly_work_days: data.weekly_work_days,
          meeting_included: data.meeting_included,
          notes: data.notes,
          status: 'pending',
          created_by: user.id
        });

      if (offerError) throw offerError;

      const response: ApiResponse<OfferResponse> = {
        data: {
          id: '',
          team_id: teamId,
          email: data.email,
          hourly_rate: data.hourly_rate,
          daily_work_hours: data.daily_work_hours,
          weekly_work_days: data.weekly_work_days,
          meeting_included: data.meeting_included,
          notes: data.notes,
          status: 'pending',
          token: '',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message: '招待メールを送信しました'
        }
      };
      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('オファー作成エラー:', error);
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      status: 500
    };
    return NextResponse.json({ error: errorResponse }, { status: 500 });
  }
}