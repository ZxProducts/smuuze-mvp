import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // リクエストボディを取得
    const { email, password, fullName, redirectTo } = await request.json(); 
    
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // redirectToからトークンとteamIdを抽出
    let invitationToken = null;
    let teamId = null;
    
    if (redirectTo) {
      try {
        const redirectUrl = new URL(redirectTo);
        invitationToken = redirectUrl.searchParams.get('token');
        teamId = redirectUrl.searchParams.get('teamId');
      } catch (e) {
        console.log('リダイレクトURL解析エラー:', e);
      }
    }

    // メール認証後のリダイレクトURLを構築
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const emailRedirectUrl = new URL(`${baseUrl}/auth/callback`);
    emailRedirectUrl.searchParams.append('email', email);
    
    // 招待トークンがある場合は追加
    if (invitationToken && teamId) {
      emailRedirectUrl.searchParams.append('invitationToken', invitationToken);
      emailRedirectUrl.searchParams.append('teamId', teamId);
    }
    
    // ユーザー登録
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: emailRedirectUrl.toString(),
      }
    });
    
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'ユーザー登録に失敗しました' },
        { status: 400 }
      );
    }
    
    // プロフィール作成
    console.log('Creating profile with user ID:', authData.user.id, 'and email:', email);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        email,
        role: 'member',
      });
    
    if (profileError) {
      console.error('Failed to create profile:', profileError);
      return NextResponse.json(
        { error: `プロフィール作成に失敗しました: ${profileError.message}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      message: '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。'
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
} 