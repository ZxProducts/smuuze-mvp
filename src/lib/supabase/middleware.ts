import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from './supabase-server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 認証状態のチェックが不要なパス
  const skipAuthCheckPaths = [
      '/_next',
      '/favicon.ico',
      '/manifest.json',
      '/sw.js',
      '/offline.html',
      '/auth/signin',
      '/api/auth'  // 認証関連のAPIエンドポイントをスキップ
  ];

  if (
    !user &&
    !skipAuthCheckPaths.some(path => request.nextUrl.pathname.startsWith(path))
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
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

  return supabaseResponse
}