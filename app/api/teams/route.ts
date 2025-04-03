import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// チームの取得
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
    
    // ユーザーが所属するチームを取得
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members!inner (
          id,
          user_id,
          role,
          hourly_rate,
          daily_work_hours,
          weekly_work_days,
          meeting_included,
          notes,
          joined_at
        )
      `)
      .eq('team_members.user_id', userId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ teams });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'チームの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// チームの作成
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
    const { 
      name, 
      description, 
      postal_code, 
      prefecture, 
      city, 
      address1, 
      address2 
    } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'チーム名は必須です' },
        { status: 400 }
      );
    }
    
    // チームを作成
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        description: description || null,
        created_by: userId,
        postal_code: postal_code || null,
        prefecture: prefecture || null,
        city: city || null,
        address1: address1 || null,
        address2: address2 || null,
      })
      .select()
      .single();
    
    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
        { status: 400 }
      );
    }
    
    // チームメンバーとして自分自身を追加（管理者として）
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'admin',
        hourly_rate: 0,
        daily_work_hours: 8,
        weekly_work_days: 5,
        meeting_included: true,
      });
    
    if (memberError) {
      // チームメンバーの追加に失敗した場合、チームも削除
      await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);
      
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ team });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'チームの作成に失敗しました' },
      { status: 500 }
    );
  }
}
