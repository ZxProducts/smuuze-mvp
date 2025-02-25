import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import { ApiResponse, ErrorResponse, ProfileResponse, TeamBasicInfo } from '@/types/api';

export const dynamic = 'force-dynamic';

type DbResult = {
  teams: {
    team: {
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      created_by: string;
    } | null;
  }[];
};

// プロフィール取得
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

    // プロフィール情報の取得（チーム情報も含む）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        created_at,
        updated_at,
        teams:team_members(
          team:teams(
            id,
            name,
            description,
            created_at,
            updated_at,
            created_by
          )
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('プロフィール取得エラー:', profileError);
      const errorResponse: ErrorResponse = {
        error: 'プロフィールの取得に失敗しました',
        status: 500,
        details: profileError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // チーム情報を整形
    const dbResult = profile as unknown as DbResult;
    const teams: TeamBasicInfo[] = dbResult.teams
      .filter((tm): tm is { team: NonNullable<DbResult['teams'][number]['team']> } => 
        tm.team !== null
      )
      .map(tm => ({
        id: tm.team.id,
        name: tm.team.name,
        description: tm.team.description || undefined,
        created_at: tm.team.created_at,
        updated_at: tm.team.updated_at,
        created_by: tm.team.created_by
      }));

    const formattedProfile: ProfileResponse = {
      ...profile,
      teams
    };

    const response: ApiResponse<ProfileResponse> = {
      data: formattedProfile
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('プロフィール取得処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// プロフィール更新
export async function PUT(request: NextRequest) {
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

    const updates = await request.json();

    // バリデーション
    if (updates.full_name && updates.full_name.length < 2) {
      const errorResponse: ErrorResponse = {
        error: '名前は2文字以上で入力してください',
        status: 400
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // プロフィールの更新
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select(`
        id,
        full_name,
        email,
        created_at,
        updated_at,
        teams:team_members(
          team:teams(
            id,
            name,
            description,
            created_at,
            updated_at,
            created_by
          )
        )
      `)
      .single();

    if (updateError) {
      console.error('プロフィール更新エラー:', updateError);
      const errorResponse: ErrorResponse = {
        error: 'プロフィールの更新に失敗しました',
        status: 500,
        details: updateError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // チーム情報を整形
    const dbResult = profile as unknown as DbResult;
    const teams: TeamBasicInfo[] = dbResult.teams
      .filter((tm): tm is { team: NonNullable<DbResult['teams'][number]['team']> } => 
        tm.team !== null
      )
      .map(tm => ({
        id: tm.team.id,
        name: tm.team.name,
        description: tm.team.description || undefined,
        created_at: tm.team.created_at,
        updated_at: tm.team.updated_at,
        created_by: tm.team.created_by
      }));

    const formattedProfile: ProfileResponse = {
      ...profile,
      teams
    };

    const response: ApiResponse<ProfileResponse> = {
      data: formattedProfile
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('プロフィール更新処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}