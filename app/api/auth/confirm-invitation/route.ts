import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin'; // RLSをバイパスして操作する場合に必要

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. 現在のユーザーセッションを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error getting session:', sessionError.message);
      return NextResponse.json({ error: 'セッションの取得に失敗しました。' }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: '認証されていません。メール認証が完了しているか確認してください。' }, { status: 401 });
    }

    const user = session.user;

    // メールが検証済みか確認 (推奨)
    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: 'メールアドレスが確認されていません。まずメール認証を完了してください。' }, { status: 403 });
    }

    // 2. リクエストボディから invitationToken を取得
    const { invitationToken } = await request.json();

    if (!invitationToken) {
      return NextResponse.json({ error: '招待トークンが必要です。' }, { status: 400 });
    }

    // 3. invitations テーブルから招待情報を検索 (supabaseAdmin を使用してRLSをバイパスする例)
    //    RLSで許可されている場合は通常の supabase クライアントでも可
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations') // 仮のテーブル名
      .select('id, team_id, invited_email, role, status') // 必要なカラム
      .eq('token', invitationToken)
      .single();

    if (invitationError || !invitation) {
      console.error('Invalid invitation token or DB error:', invitationError?.message);
      return NextResponse.json({ error: '無効な招待トークンです。' }, { status: 404 });
    }

    // 4. 招待の有効性をチェック
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'この招待は既に使用済みか、期限切れです。' }, { status: 410 }); // 410 Gone
    }

    // 招待されたメールアドレスと現在のユーザーのメールアドレスが一致するか確認
    if (invitation.invited_email && invitation.invited_email.toLowerCase() !== user.email?.toLowerCase()) {
      console.warn(`Invited email (${invitation.invited_email}) does not match user email (${user.email}).`);
      return NextResponse.json({ error: '招待されたメールアドレスと登録メールアドレスが一致しません。' }, { status: 403 });
    }

    // 5. team_members テーブルにユーザーを追加 (supabaseAdmin を使用する例)
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: invitation.role || 'member', // 招待情報にロールがなければデフォルトで 'member'
        joined_at: new Date().toISOString(),
        // hourly_rate, daily_work_hours など、必要に応じてデフォルト値を設定
      });

    if (memberError) {
      console.error('Failed to add user to team:', memberError.message);
      // 既にメンバーである場合のエラーコード(例: 23505 for unique_violation)を考慮して、より親切なメッセージを返すことも可能
      if (memberError.code === '23505') {
        // 既にメンバーかもしれないので、招待ステータスだけ更新してみる (任意)
        await supabaseAdmin
          .from('invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_user_id: user.id })
          .eq('id', invitation.id);
        return NextResponse.json({ success: true, message: '既にチームのメンバーである可能性があります。招待を承認済みにしました。' });
      }
      return NextResponse.json({ error: 'チームへの参加処理に失敗しました。' }, { status: 500 });
    }

    // 6. invitations テーブルの招待情報を更新 (使用済みにする)
    const { error: updateInvitationError } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_user_id: user.id })
      .eq('id', invitation.id); // tokenではなくinvitation.idで更新

    if (updateInvitationError) {
      console.error('Failed to update invitation status:', updateInvitationError.message);
      // ここでのエラーは致命的ではないかもしれないが、ログには残す
    }

    console.log(`User ${user.id} successfully added to team ${invitation.team_id} via invitation ${invitation.id}`);

    return NextResponse.json({ success: true, message: 'チームへの参加が完了しました。' });

  } catch (error: any) {
    console.error('Confirm invitation error:', error.message);
    return NextResponse.json(
      { error: error.message || '招待の確認処理中にエラーが発生しました。' },
      { status: 500 }
    );
  }
} 