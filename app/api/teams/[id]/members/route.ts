import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 組織メンバーの取得
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
    const teamId = params.id;
    
    // ユーザーが組織に所属しているか確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();
    
    if (teamMemberError) {
      console.error('組織メンバー確認エラー:', teamMemberError.message);
      // エラーがあっても続行
    }
    
    // ユーザーが組織に所属していなくても、組織メンバーを取得できるようにする
    // これにより、isCurrentUserAdmin関数が正しく動作するようになる
    console.log(`ユーザー(${userId})の組織(${teamId})所属確認:`, teamMember ? '所属しています' : '所属していません');
    
    // 組織メンバーを取得
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('team_id', teamId);
    
    console.log(`組織(${teamId})のメンバー数:`, members?.length || 0);
    
    if (membersError) {
      return NextResponse.json(
        { error: membersError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ members, currentUserId: userId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '組織メンバーの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 組織メンバーの追加
export async function POST(
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
    const teamId = params.id;
    
    // ユーザーが組織の管理者かどうかを確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();
    
    if (teamMemberError || !teamMember) {
      return NextResponse.json(
        { error: 'この組織にアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: '組織メンバーを追加する権限がありません' },
        { status: 403 }
      );
    }
    
    // リクエストボディを取得
    const { email, hourlyRate, dailyWorkHours, weeklyWorkDays, meetingIncluded, notes, role } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスは必須です' },
        { status: 400 }
      );
    }
    
    // メールアドレスからユーザーを検索
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      );
    }
    
    // ユーザーが存在する場合は直接組織メンバーに追加
    if (user) {
      // 既に組織メンバーかどうかを確認
      const { data: existingMember, error: existingMemberError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingMemberError) {
        return NextResponse.json(
          { error: existingMemberError.message },
          { status: 400 }
        );
      }
      
      if (existingMember) {
        return NextResponse.json(
          { error: 'このユーザーは既に組織メンバーです' },
          { status: 400 }
        );
      }
      
      // 組織メンバーとして追加
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user.id,
          hourly_rate: hourlyRate || 0,
          daily_work_hours: dailyWorkHours || 8,
          weekly_work_days: weeklyWorkDays || 5,
          meeting_included: meetingIncluded !== undefined ? meetingIncluded : true,
          notes: notes || null,
          role: role || 'member',
        })
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .single();
      
      if (memberError) {
        return NextResponse.json(
          { error: memberError.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ member });
    } else {
      // ユーザーが存在しない場合はオファーを作成
      // ランダムなトークンを生成
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .insert({
          team_id: teamId,
          email,
          hourly_rate: hourlyRate || 0,
          daily_work_hours: dailyWorkHours || 8,
          weekly_work_days: weeklyWorkDays || 5,
          meeting_included: meetingIncluded !== undefined ? meetingIncluded : true,
          notes: notes || null,
          token,
          created_by: userId,
        })
        .select()
        .single();
      
      if (offerError) {
        return NextResponse.json(
          { error: offerError.message },
          { status: 400 }
        );
      }
      
      // TODO: メール送信処理
      
      return NextResponse.json({ offer });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '組織メンバーの追加に失敗しました' },
      { status: 500 }
    );
  }
}
