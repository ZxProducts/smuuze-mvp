import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // デバッグ用：リクエストのCookieを確認
  console.log('updateSession - リクエストCookie:', request.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 10)}...`));

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // デバッグ用：設定するCookieを確認
              console.log(`Cookie設定: ${name}=${value.substring(0, 10)}...`, options);
              request.cookies.set(name, value)
            })
            
            supabaseResponse = NextResponse.next({
              request,
            })
            
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, {
                ...options,
                // Cookieの設定を明示的に指定
                path: options?.path || '/',
                httpOnly: options?.httpOnly !== false,
                secure: process.env.NODE_ENV === 'production' && options?.secure !== false,
                sameSite: options?.sameSite || 'lax',
              })
            })
          },
        },
      }
    )

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: DO NOT REMOVE auth.getUser()

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('updateSession - ユーザー取得エラー:', userError.message);
    }

    // セッション情報も取得して確認
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('updateSession - セッション取得エラー:', sessionError.message);
    }

    console.log('updateSession - 認証状態:', {
      hasUser: !!user,
      hasSession: !!session,
      userId: user?.id,
      path: request.nextUrl.pathname
    });

    // 認証が必要なページへのアクセスで、ユーザーが認証されていない場合
    const publicPaths = [
      '/api/auth',
      '/login',
      '/register',
      '/reset-password',
      '/update-password'
    ];
    
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));
    
    if (!user && !isPublicPath) {
      // API ルートの場合は JSON エラーレスポンスを返す
      // (middleware.ts で処理されるため、ここでは通常のリダイレクトを返す)
      console.log('updateSession - 認証されていないユーザーを /login にリダイレクト');
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    // If you're creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    // デバッグ用：レスポンスのCookieを確認
    console.log('updateSession - レスポンスCookie:', supabaseResponse.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 10)}...`));

    return supabaseResponse
  } catch (error) {
    console.error('updateSession - 予期せぬエラー:', error);
    // エラーが発生した場合でも、レスポンスを返す
    return supabaseResponse;
  }
}
