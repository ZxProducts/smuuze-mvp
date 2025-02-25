import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import {
  CreateTeamRequest,
  TeamResponse,
  ErrorResponse,
  ApiResponse
} from '@/types/api';

export const dynamic = 'force-dynamic';

// チーム一覧取得
export async function GET(request: NextRequest) {
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

    // ユーザーが所属するチームのIDを取得
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('チームメンバー情報取得エラー:', memberError);
      const errorResponse: ErrorResponse = {
        error: 'チーム情報の取得に失敗しました',
        status: 500,
        details: memberError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const teamIds = memberTeams.map(mt => mt.team_id);

    // チーム情報を取得（必要な情報のみ選択して無限再帰を防ぐ）
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        created_by,
        members:team_members!inner(
          id,
          team_id,
          user_id,
          role,
          hourly_rate,
          daily_work_hours,
          weekly_work_days,
          meeting_included,
          notes,
          joined_at,
          profile:profiles!left(
            id,
            full_name,
            email,
            created_at,
            updated_at
          )
        ),
        offers(
          id,
          team_id,
          email,
          token,
          hourly_rate,
          daily_work_hours,
          weekly_work_days,
          meeting_included,
          notes,
          status,
          created_at,
          created_by,
          updated_at
        )
      `)
      .in('id', teamIds);

    if (teamsError) {
      console.error('チーム情報取得エラー:', teamsError);
      const errorResponse: ErrorResponse = {
        error: 'チーム情報の取得に失敗しました',
        status: 500,
        details: teamsError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    console.log('チーム一覧取得:', teams[0].members);

    // レスポンスデータの整形
    const formattedTeams = teams.map(team => ({
      ...team,
      members: team.members.map(member => ({
        ...member,
        profile: Array.isArray(member.profile) ? member.profile[0] : member.profile || {
          id: member.user_id,
          full_name: 'Unknown User',
          email: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }))
    }));

    const response: ApiResponse<TeamResponse[]> = {
      data: formattedTeams
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('チーム一覧取得処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// チーム作成
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // セッションの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        error: '認証が必要です',
        status: 401
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { name, description }: CreateTeamRequest = await request.json();

    // バリデーション
    if (!name) {
      const errorResponse: ErrorResponse = {
        error: 'チーム名は必須です',
        status: 400
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const now = new Date().toISOString();

    // チームの作成
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        created_by: user.id,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (teamError) {
      console.error('チーム作成エラー:', teamError);
      const errorResponse: ErrorResponse = {
        error: 'チームの作成に失敗しました',
        status: 500,
        details: teamError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // チーム作成者をメンバーとして追加
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'admin',
        hourly_rate: 0,
        daily_work_hours: 8,
        weekly_work_days: 5,
        meeting_included: false,
        joined_at: now
      })
      .select()
      .single();

    if (memberError) {
      console.error('チームメンバー追加エラー:', memberError);
      // チームメンバー追加に失敗した場合、作成したチームを削除
      await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);

      const errorResponse: ErrorResponse = {
        error: 'チームメンバーの追加に失敗しました',
        status: 500,
        details: memberError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const response: ApiResponse<TeamResponse> = {
      data: {
        ...team,
        members: [
          {
            ...member,
            profile: null
          }
        ],
        offers: []
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('チーム作成処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}