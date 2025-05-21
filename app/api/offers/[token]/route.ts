import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyInviteToken } from '@/lib/invite-utils';

// オファーの取得（トークンによる）
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const token = params.token;
    
    console.log('オファー取得リクエスト: token=', token.substring(0, 10) + '...');
    
    // トークンが署名付きの場合は検証して本来のトークンを取得
    let tokenToUse = token;
    
    if (token.includes('.') || token.includes('+') || token.includes('/') || token.includes('=')) {
      // Base64らしい形式の場合、署名付きトークンとして検証
      console.log('署名付きトークンの検証を実行');
      const verificationResult = verifyInviteToken(token);
      
      if (!verificationResult.valid) {
        console.error('トークン検証失敗:', verificationResult.error);
        return NextResponse.json(
          { error: verificationResult.error },
          { status: 400 }
        );
      }
      
      tokenToUse = verificationResult.token as string;
      console.log('トークン検証成功: 実際のトークン=', tokenToUse.substring(0, 10) + '...');
    }
    
    // オファーを取得
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        teams:team_id (
          id,
          name,
          description
        )
      `)
      .eq('token', tokenToUse)
      .eq('status', 'pending')
      .single();
    
    if (offerError) {
      console.error('オファー取得エラー:', offerError.message);
      return NextResponse.json(
        { error: offerError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ offer });
  } catch (error: any) {
    console.error('オファー取得中の予期せぬエラー:', error);
    return NextResponse.json(
      { error: error.message || 'オファーの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// オファーの承諾
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
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
    const token = params.token;
    
    console.log('オファー承諾リクエスト: token=', token.substring(0, 10) + '...', 'user=', userId);
    
    // トークンが署名付きの場合は検証して本来のトークンを取得
    let tokenToUse = token;
    
    if (token.includes('.') || token.includes('+') || token.includes('/') || token.includes('=')) {
      // Base64らしい形式の場合、署名付きトークンとして検証
      console.log('署名付きトークンの検証を実行');
      const verificationResult = verifyInviteToken(token);
      
      if (!verificationResult.valid) {
        console.error('トークン検証失敗:', verificationResult.error);
        return NextResponse.json(
          { error: verificationResult.error },
          { status: 400 }
        );
      }
      
      tokenToUse = verificationResult.token as string;
      console.log('トークン検証成功: 実際のトークン=', tokenToUse.substring(0, 10) + '...');
    }
    
    // オファーを取得
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('token', tokenToUse)
      .eq('status', 'pending')
      .maybeSingle();
    
    if (offerError) {
      console.error('オファー取得エラー:', offerError.message);
      return NextResponse.json(
        { error: offerError.message },
        { status: 400 }
      );
    }
    
    if (!offer) {
      console.error('オファーが見つかりません: token=', tokenToUse.substring(0, 10) + '...');
      return NextResponse.json(
        { error: '有効な招待が見つかりません' },
        { status: 400 }
      );
    }
    
    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('プロフィール取得エラー:', profileError.message);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }
    
    // オファーのメールアドレスとユーザーのメールアドレスが一致するか確認
    if (profile.email !== offer.email) {
      console.error('メールアドレス不一致: offer_email=', offer.email, 'profile_email=', profile.email);
      return NextResponse.json(
        { error: 'このオファーは別のメールアドレス宛てに送信されています' },
        { status: 403 }
      );
    }
    
    console.log('オファー承諾処理: team_id=', offer.team_id, 'user_id=', userId);
    
    // トランザクション的に処理
    // 1. オファーのステータスを更新
    const { error: updateError } = await supabase
      .from('offers')
      .update({ status: 'accepted' })
      .eq('id', offer.id);
    
    if (updateError) {
      console.error('オファーステータス更新エラー:', updateError.message);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }
    
    // 2. 組織メンバーとして追加
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: offer.team_id,
        user_id: userId,
        hourly_rate: offer.hourly_rate,
        daily_work_hours: offer.daily_work_hours,
        weekly_work_days: offer.weekly_work_days,
        meeting_included: offer.meeting_included,
        notes: offer.notes,
        role: 'member',
      })
      .select()
      .single();
    
    if (memberError) {
      // 組織メンバーの追加に失敗した場合、オファーのステータスを元に戻す
      console.error('組織メンバー追加エラー:', memberError.message);
      await supabase
        .from('offers')
        .update({ status: 'pending' })
        .eq('id', offer.id);
      
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      );
    }
    
    console.log('オファー承諾成功: member_id=', member.id);
    
    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    console.error('オファー承諾中の予期せぬエラー:', error);
    return NextResponse.json(
      { error: error.message || 'オファーの承諾に失敗しました' },
      { status: 500 }
    );
  }
}

// オファーの拒否
export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
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
    const token = params.token;
    
    // トークンが署名付きの場合は検証して本来のトークンを取得
    let tokenToUse = token;
    
    if (token.includes('.') || token.includes('+') || token.includes('/') || token.includes('=')) {
      const verificationResult = verifyInviteToken(token);
      
      if (!verificationResult.valid) {
        return NextResponse.json(
          { error: verificationResult.error },
          { status: 400 }
        );
      }
      
      tokenToUse = verificationResult.token as string;
    }
    
    // オファーを取得
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('token', tokenToUse)
      .eq('status', 'pending')
      .maybeSingle();
    
    if (offerError) {
      return NextResponse.json(
        { error: offerError.message },
        { status: 400 }
      );
    }
    
    if (!offer) {
      return NextResponse.json(
        { error: '有効な招待が見つかりません' },
        { status: 400 }
      );
    }
    
    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }
    
    // オファーのメールアドレスとユーザーのメールアドレスが一致するか確認
    if (profile.email !== offer.email) {
      return NextResponse.json(
        { error: 'このオファーは別のメールアドレス宛てに送信されています' },
        { status: 403 }
      );
    }
    
    // オファーのステータスを更新
    const { error: updateError } = await supabase
      .from('offers')
      .update({ status: 'rejected' })
      .eq('id', offer.id);
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'オファーの拒否に失敗しました' },
      { status: 500 }
    );
  }
}
