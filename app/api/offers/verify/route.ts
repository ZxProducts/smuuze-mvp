import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyInviteToken } from '@/lib/invite-utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // URLからクエリパラメータを取得
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'トークンが指定されていません' },
        { status: 400 }
      );
    }
    
    console.log('トークン検証処理開始:', token.substring(0, 10) + '...');
    
    // トークンが署名付きの場合は検証する
    let tokenToUse = token;
    let email = null;
    
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
      email = verificationResult.email;
      console.log('トークン検証成功: token=', tokenToUse.substring(0, 10) + '...', 'email=', email);
    }
    
    // データベースからオファーを取得
    console.log('オファー検索: token=', tokenToUse.substring(0, 10) + '...');
    
    // まず.maybeSingle()を使ってオファーが存在するか確認
    const { data: offerCheck, error: checkError } = await supabase
      .from('offers')
      .select('id, status, token')
      .eq('token', tokenToUse)
      .maybeSingle();
    
    console.log('オファー検索結果:', offerCheck ? 'データあり' : 'データなし', '実際のトークン:', tokenToUse);
    
    if (checkError) {
      console.error('オファー検索エラー:', checkError.message);
      return NextResponse.json(
        { error: checkError.message },
        { status: 400 }
      );
    }
    
    // オファーが存在しない場合
    if (!offerCheck) {
      // デバッグ用に全てのオファートークンを確認
      const { data: allOffers, error: allOffersError } = await supabase
        .from('offers')
        .select('token, status, email')
        .limit(10);
        
      console.error('オファーが見つかりません。検索トークン=', tokenToUse);
      console.log('データベース内の最初の10件のオファー:', 
        allOffers?.map(o => ({ 
          token_prefix: o.token.substring(0, 10) + '...', 
          status: o.status,
          email: o.email
        }))
      );
      
      return NextResponse.json(
        { error: '有効な招待が見つかりません' },
        { status: 400 }
      );
    }
    
    // ステータスチェック
    if (offerCheck.status !== 'pending') {
      console.error('オファーはすでに処理済みです: status=', offerCheck.status);
      return NextResponse.json(
        { error: 'この招待はすでに処理されているか、無効になっています' },
        { status: 400 }
      );
    }
    
    // 完全なオファー情報を取得
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
      console.error('オファー詳細の取得エラー:', offerError.message);
      return NextResponse.json(
        { error: offerError.message },
        { status: 400 }
      );
    }
    
    // メールアドレスが一致するか確認（署名付きトークンの場合）
    if (email && offer.email !== email) {
      console.error('メールアドレス不一致: token_email=', email, 'offer_email=', offer.email);
      return NextResponse.json(
        { error: 'メールアドレスが一致しません' },
        { status: 403 }
      );
    }
    
    console.log('オファー検証成功: id=', offer.id, 'team=', offer.teams?.name || 'unknown');
    
    return NextResponse.json({
      offer,
      valid: true,
      email: offer.email
    });
  } catch (error: any) {
    console.error('トークン検証中の予期せぬエラー:', error);
    return NextResponse.json(
      { error: error.message || 'トークンの検証に失敗しました' },
      { status: 500 }
    );
  }
} 