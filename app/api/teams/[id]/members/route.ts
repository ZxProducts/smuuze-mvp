import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendInvitationEmail } from '@/lib/email';
import { generateInviteToken, generateInviteLink, signInviteToken, getBaseUrl } from '@/lib/invite-utils';

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
    
    // 組織情報を取得（メール送信用）
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();
      
    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
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
      // セキュアなトークンを生成
      const shortInviteToken = generateInviteToken();

      // 署名付きトークンを一度だけ生成
      const signedInviteToken = signInviteToken(shortInviteToken, email);
      
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
          token: signedInviteToken,
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
      
      // ★ 招待リンクを手動で組み立てる
      const baseUrl = getBaseUrl();
      const invitationLink = `${baseUrl}/invite?token=${encodeURIComponent(signedInviteToken)}&teamId=${teamId}`;
      
      // SendGridを使って招待メールを送信
      const emailResult = await sendInvitationEmail(
        email,
        team.name,
        invitationLink
      );
      
      if (!emailResult.success) {
        console.error('招待メール送信エラー:', emailResult.error);
        // メール送信に失敗した場合でもオファーは作成する（管理者が再送信できるようにするため）
      }
      
      return NextResponse.json({ 
        offer,
        emailSent: emailResult.success 
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '組織メンバーの追加に失敗しました' },
      { status: 500 }
    );
  }
}
