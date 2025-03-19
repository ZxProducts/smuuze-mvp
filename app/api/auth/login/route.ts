import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 現在のユーザー情報を取得
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーのセッションを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('セッション取得エラー:', sessionError.message);
      return NextResponse.json(
        { error: sessionError.message },
        { status: 401 }
      );
    }
    
    if (!session) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }
    
    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      console.error('ユーザー情報取得エラー:', userError.message);
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      );
    }
    
    console.log('ユーザー情報取得成功:', {
      userId: session.user.id,
      email: session.user.email,
      userData: userData
    });
    
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        ...userData
      }
    });
  } catch (error: any) {
    console.error('ユーザー情報取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: error.message || 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerSupabaseClient();
    
    // パスワードでサインイン
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('ログインエラー:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    // セッション情報をCookieに保存し、Supabaseセッションを設定
    const cookieStore = cookies();
    if (data.session) {
      // アクセストークンをCookieに保存
      cookieStore.set('sb-access-token', data.session.access_token, {
        path: '/',
        maxAge: data.session.expires_in,
        httpOnly: true,
        secure: true, // 常にsecureを有効に（Vercel環境はHTTPS）
        sameSite: 'none', // クロスサイトリクエストを許可
        partitioned: true, // Partitioned属性を追加（Chrome 134以降のプライバシー対応）
      });
      
      // リフレッシュトークンをCookieに保存
      cookieStore.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30日間
        httpOnly: true,
        secure: true, // 常にsecureを有効に（Vercel環境はHTTPS）
        sameSite: 'none', // クロスサイトリクエストを許可
        partitioned: true, // Partitioned属性を追加（Chrome 134以降のプライバシー対応）
      });
      
      // Supabaseセッションを明示的に設定
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      
      if (setSessionError) {
        console.error('セッション設定エラー:', setSessionError.message);
        return NextResponse.json(
          { error: 'セッション設定に失敗しました: ' + setSessionError.message },
          { status: 500 }
        );
      } else {
        console.log('セッション設定完了:', {
          userId: data.user?.id,
          expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'undefined',
          accessTokenLength: data.session.access_token.length,
          refreshTokenLength: data.session.refresh_token.length
        });
        
        // デバッグ用：設定されたCookieを確認
        console.log('設定されたCookie:', cookieStore.getAll().map(c => c.name));
      }
      
      // セッションが正しく設定されたか確認
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('セッション検証エラー:', sessionError.message);
      } else {
        console.log('セッション検証成功:', {
          hasSession: !!sessionData.session,
          userId: sessionData.session?.user.id
        });
      }
    } else {
      console.error('セッションデータがありません');
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'ログインに失敗しました' },
      { status: 500 }
    );
  }
}
