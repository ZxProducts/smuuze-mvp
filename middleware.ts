import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

// CORSヘッダーを設定する関数
function setCorsHeaders(request: NextRequest, response: NextResponse) {
  // リクエストのオリジンを取得
  const origin = request.headers.get('origin') || '';
  
  // 許可するオリジンのリスト（必要に応じて追加）
  const allowedOrigins = [
    'https://smuuze-i11t2l894-smuuze-project.vercel.app',
    'https://smuuze-mvp-khaki.vercel.app',
    'https://smuuze-mvp.vercel.app'
  ];
  
  // 開発環境では localhost を許可
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }
  
  // リクエストのオリジンが許可リストに含まれている場合、そのオリジンを許可
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    // オリジンが許可リストにない場合でも、Vercelのドメインからのリクエストを許可
    if (origin.endsWith('.vercel.app')) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
  }
  
  // credentials: 'include' モードをサポートするために必要
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return response;
}

export async function middleware(request: NextRequest) {
  // デバッグ用：リクエストのCookieを確認
  console.log('Middleware - リクエストCookie:', request.cookies.getAll().map(c => c.name));
  
  // API ルートへのリクエストかどうかを確認
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  
  // OPTIONSリクエスト（プリフライトリクエスト）の場合は、CORSヘッダーを設定して即時応答
  if (isApiRoute && request.method === 'OPTIONS') {
    const response = NextResponse.json({}, { status: 200 });
    return setCorsHeaders(request, response);
  }
  
  // 認証が不要なAPIルート
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/reset-password',
    '/api/auth/update-password',
    '/api/offers'
  ];
  
  // 認証が必要なAPIルートかどうかを確認
  const isProtectedApiRoute = isApiRoute && 
    !publicApiRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  
  // API ルートへのリクエストの場合は、認証チェックを行い、
  // 認証されていない場合は JSON エラーレスポンスを返す
  if (isProtectedApiRoute) {
    try {
      const response = await updateSession(request);
      
      // updateSession 関数内で認証チェックが行われ、
      // ユーザーが認証されていない場合は /login にリダイレクトされる
      // API ルートの場合は、リダイレクトではなく JSON エラーレスポンスを返す
      if (response.status === 307 && response.headers.get('location')?.includes('/login')) {
        console.log('Middleware - 認証エラー:', request.nextUrl.pathname);
        const errorResponse = NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        );
        return setCorsHeaders(request, errorResponse);
      }
      
      // API ルートの場合は、レスポンスにCORSヘッダーを追加
      return setCorsHeaders(request, response);
    } catch (error) {
      console.error('Middleware - エラー:', error);
      const errorResponse = NextResponse.json(
        { error: '認証処理中にエラーが発生しました' },
        { status: 500 }
      );
      return setCorsHeaders(request, errorResponse);
    }
  }
  
  // 通常のルートの場合は、従来通りの処理を行う
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
