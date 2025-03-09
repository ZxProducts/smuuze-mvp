import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// プロジェクトの取得
export async function GET(request: NextRequest) {
  try {
    // デバッグ用のログ
    console.log('GET /api/projects が呼び出されました');
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      // 認証エラーの場合でも、デバッグ用に空のプロジェクト配列を返す
      console.log('認証エラー:', userError?.message || 'ユーザーがありません');
      return NextResponse.json({ projects: [], debug: '認証エラー: ユーザーがありません' });
    }
    
    const userId = user.id;
    
    // ユーザーが所属するチームを取得
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);
    
    if (teamError) {
      return NextResponse.json({ projects: [], debug: `チーム取得エラー: ${teamError.message}` });
    }
    
    // ユーザーが所属するチームのIDを抽出
    const teamIds = teamMembers.map((member: { team_id: string }) => member.team_id);
    
    if (teamIds.length === 0) {
      return NextResponse.json({ projects: [], debug: '所属チームなし' });
    }
    
    // チームに紐づくプロジェクトを取得
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .in('team_id', teamIds)
      .order('name');
    
    if (projectError) {
      return NextResponse.json({ projects: [], debug: `プロジェクト取得エラー: ${projectError.message}` });
    }
    
    return NextResponse.json({ projects, debug: 'プロジェクト取得成功' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロジェクトの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// プロジェクトの作成
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
    const { name, description, teamId, startDate, endDate } = await request.json();
    
    if (!name || !teamId || !startDate) {
      return NextResponse.json(
        { error: 'プロジェクト名、チームID、開始日は必須です' },
        { status: 400 }
      );
    }
    
    // ユーザーがチームの管理者かどうかを確認
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();
    
    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'プロジェクトを作成する権限がありません' },
        { status: 403 }
      );
    }
    
    // プロジェクトを作成
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || null,
        team_id: teamId,
        start_date: startDate,
        end_date: endDate || null,
        created_by: userId,
      })
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ project: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロジェクトの作成に失敗しました' },
      { status: 500 }
    );
  }
}
