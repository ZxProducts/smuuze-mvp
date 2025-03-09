import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// オファーの取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 認証済みユーザーのセッションを取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // ユーザーが管理者のチームを取得
    const { data: adminTeams, error: adminTeamsError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('role', 'admin');
    
    if (adminTeamsError) {
      return NextResponse.json(
        { error: adminTeamsError.message },
        { status: 400 }
      );
    }
    
    // 管理者のチームがない場合は空の配列を返す
    if (!adminTeams || adminTeams.length === 0) {
      return NextResponse.json({ offers: [] });
    }
    
    // 管理者のチームのIDを抽出
    const teamIds = adminTeams.map(team => team.team_id);
    
    // オファーを取得
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select(`
        *,
        teams:team_id (
          id,
          name
        ),
        creator:created_by (
          id,
          email,
          full_name:profiles!inner(full_name)
        )
      `)
      .in('team_id', teamIds)
      .order('created_at', { ascending: false });
    
    if (offersError) {
      return NextResponse.json(
        { error: offersError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ offers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'オファーの取得に失敗しました' },
      { status: 500 }
    );
  }
}
