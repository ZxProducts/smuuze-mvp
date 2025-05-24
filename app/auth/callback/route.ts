export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const url = new URL(request.url);
    
    // URLパラメータから情報を取得
    const code = url.searchParams.get('code');
    const invitationToken = url.searchParams.get('invitationToken');
    const teamId = url.searchParams.get('teamId');
    const email = url.searchParams.get('email');
    
    console.log('Auth callback:', { 
      hasCode: !!code, 
      hasInvitationToken: !!invitationToken, 
      teamId, 
      email 
    });

    if (code) {
      // メール認証コードを交換してセッションを確立
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(new URL('/login?error=認証に失敗しました', request.url));
      }

      if (!session || !session.user) {
        console.error('No session after code exchange');
        return NextResponse.redirect(new URL('/login?error=セッションの作成に失敗しました', request.url));
      }

      console.log('User authenticated:', session.user.id);

      // 招待トークンがある場合、チームに自動追加
      if (invitationToken && teamId) {
        try {
          console.log('Processing invitation for user:', session.user.id);
          
          // オファーを検索
          const { data: offer, error: offerError } = await supabaseAdmin
            .from('offers')
            .select('*')
            .eq('token', invitationToken)
            .eq('status', 'pending')
            .single();

          if (offerError || !offer) {
            console.error('Offer not found:', offerError?.message);
            return NextResponse.redirect(new URL(`/invite?token=${encodeURIComponent(invitationToken)}&teamId=${teamId}&error=招待が見つかりません`, request.url));
          }

          // メールアドレスが一致するか確認
          if (offer.email !== session.user.email) {
            console.error('Email mismatch:', { offerEmail: offer.email, userEmail: session.user.email });
            return NextResponse.redirect(new URL(`/invite?token=${encodeURIComponent(invitationToken)}&teamId=${teamId}&error=メールアドレスが一致しません`, request.url));
          }

          // チームメンバーとして追加
          const { error: memberError } = await supabaseAdmin
            .from('team_members')
            .insert({
              team_id: offer.team_id,
              user_id: session.user.id,
              hourly_rate: offer.hourly_rate,
              daily_work_hours: offer.daily_work_hours,
              weekly_work_days: offer.weekly_work_days,
              meeting_included: offer.meeting_included,
              notes: offer.notes,
              role: 'member',
              joined_at: new Date().toISOString(),
            });

          if (memberError) {
            console.error('Failed to add team member:', memberError);
            // エラーでも招待ページにリダイレクトして手動で処理できるようにする
            return NextResponse.redirect(new URL(`/invite/accept?token=${encodeURIComponent(invitationToken)}&teamId=${teamId}`, request.url));
          }

          // オファーのステータスを更新
          await supabaseAdmin
            .from('offers')
            .update({ 
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              accepted_user_id: session.user.id
            })
            .eq('id', offer.id);

          console.log('Successfully added user to team:', { userId: session.user.id, teamId: offer.team_id });

          // チームページにリダイレクト
          return NextResponse.redirect(new URL(`/team/${teamId}?welcome=true`, request.url));

        } catch (error) {
          console.error('Error processing invitation:', error);
          // エラーが発生した場合は招待受諾ページにリダイレクト
          return NextResponse.redirect(new URL(`/invite/accept?token=${encodeURIComponent(invitationToken)}&teamId=${teamId}`, request.url));
        }
      }

      // 招待トークンがない場合は通常のダッシュボードにリダイレクト
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // コードがない場合はログインページにリダイレクト
    return NextResponse.redirect(new URL('/login?error=認証コードが見つかりません', request.url));

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=認証処理中にエラーが発生しました', request.url));
  }
} 