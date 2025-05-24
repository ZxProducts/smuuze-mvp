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
    
    // トークンの形式を確認して署名付きトークンを処理
    let verificationResult = null;
    let tokenToUse = token; // 常にURLのトークンを検索に使用する
    let email = null;
    let isSignedTokenValid = false; // 署名付きトークンが有効かどうかのフラグ

    // Base64エンコードされているかを確認
    const base64Pattern = /^[A-Za-z0-9+/=]+$/;
    const isBase64 = base64Pattern.test(token);
    
    if (isBase64) {
      // 署名付きトークンとして検証を試みる
      console.log('署名付きトークンの検証を実行');
      verificationResult = verifyInviteToken(token);
      
      if (verificationResult.valid) {
        // 検証成功
        email = verificationResult.email;
        isSignedTokenValid = true; // 署名が有効だったことを記録
        // tokenToUse = verificationResult.token as string; // ★この行をコメントアウト (または削除)
        console.log('トークン署名検証成功: email=', email, '検索には元の署名付きトークンを使用します:', token.substring(0,10) + '...');
      } else {
        // Base64形式だが検証失敗の場合はそのまま使用
        console.log('署名付きトークンの検証失敗、元のトークンをそのまま使用します:', token.substring(0,10) + '...');
      }
    }
    
    // データベースからオファーを取得
    console.log('オファー検索: token=', tokenToUse.substring(0, 10) + '...'); // tokenToUse はURLのtokenと同じはず
    
    // まず.maybeSingle()を使ってオファーが存在するか確認
    const { data: offerCheck, error: checkError } = await supabase
      .from('offers')
      .select('id, status, token, email')
      .eq('token', tokenToUse) // URLのトークンで検索
      .maybeSingle();
    
    console.log('オファー検索結果:', offerCheck ? 'データあり' : 'データなし', '検索トークン:', tokenToUse.substring(0, 10) + '...');
    
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
        
      console.error('オファーが見つかりません。検索トークン=', tokenToUse.substring(0, 10) + '...');
      console.log('データベース内の最初の10件のオファー:', 
        allOffers?.map(o => ({ 
          token: o.token,
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
    
    // メールアドレスが一致するか確認（署名付きトークンが有効だった場合のみ）
    if (isSignedTokenValid && email && offerCheck.email !== email) { // isSignedTokenValid の条件を追加
      console.error('メールアドレス不一致: token_email=', email, 'offer_email=', offerCheck.email);
      return NextResponse.json(
        { error: 'メールアドレスが一致しません' },
        { status: 403 }
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
      .eq('token', tokenToUse) // URLのトークンで検索
      .eq('status', 'pending')
      .single();
    
    if (offerError) {
      console.error('オファー詳細の取得エラー:', offerError.message);
      return NextResponse.json(
        { error: offerError.message },
        { status: 400 }
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