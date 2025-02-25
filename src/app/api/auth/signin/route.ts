import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthResponse, ErrorResponse } from '@/types/api';
import { createClient } from '@/lib/supabase/supabase-server';

// レスポンスを生成する共通関数
async function createResponseWithCookies(data: object, status: number = 200) {
  const cookieStore = await cookies();
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'application/json');
  
  cookieStore.getAll().forEach(cookie => {
    responseHeaders.append('Set-Cookie', cookie.value);
  });

  return new NextResponse(JSON.stringify(data), {
    status,
    headers: responseHeaders
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Request Headers:', request.headers);
    const { email, password } = await request.json();

    // バリデーション
    if (!email || !password) {
      return createResponseWithCookies({
        error: 'メールアドレスとパスワードは必須です',
        status: 400,
      }, 400);
    }

    const supabase = await createClient();

    // サインイン処理
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('サインインエラー:', {
        name: signInError.name,
        message: signInError.message,
        status: signInError.status,
      });
      return createResponseWithCookies({
        error: 'メールアドレスまたはパスワードが正しくありません',
        status: 401,
        details: signInError,
      }, 401);
    }

    if (!session) {
      return createResponseWithCookies({
        error: 'セッションの作成に失敗しました',
        status: 500,
      }, 500);
    }

    // プロフィール情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('プロフィール取得エラー:', profileError);
      // プロフィール取得に失敗しても、認証自体は成功しているのでエラーは返さない
    }

    const responseBody: AuthResponse = {
      user: {
        id: session.user.id,
        email: session.user.email!,
        created_at: session.user.created_at,
        updated_at: new Date().toISOString(),
        ...(profile || {}),
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token!,
        expires_at: session.expires_at!,
      },
    };

    // レスポンスを返す（SupabaseのSSR SDKが自動的にセッションCookieを設定する）
    return createResponseWithCookies(responseBody, 200);
  } catch (error) {
    console.error('サインイン処理エラー:', error);
    return createResponseWithCookies({
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error,
    }, 500);
  }
}
