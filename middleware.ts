import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

// CORSヘッダーを設定する関数
function setCorsHeaders(request: NextRequest, response: NextResponse) {
  // リクエストのオリジンを取得
  const origin = request.headers.get('origin') || '';
  
  // 許可するオリジンのリスト（必要に応じて追加）
  const allowedOrigins = [
    'https://smuuze-i11t2l894-smuuze-project.vercel.app',
    'https://smuuze-mvp-khaki.vercel.app'
  ];
  
  // リクエストのオリジンが許可リストに含まれている場合、そのオリジンを許可
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    // credentials: 'include' モードをサポートするために必要
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function middleware(request: NextRequest) {
  // API ルートへのリクエストかどうかを確認
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  
  // OPTIONSリクエスト（プリフライトリクエスト）の場合は、CORSヘッダーを設定して即時応答
  if (isApiRoute && request.method === 'OPTIONS') {
    const response = NextResponse.json({}, { status: 200 });
    return setCorsHeaders(request, response);
  }
  
  // API ルートへのリクエストの場合は、認証チェックを行い、
  // 認証されていない場合は JSON エラーレスポンスを返す
  if (isApiRoute && !request.nextUrl.pathname.startsWith('/api/auth')) {
    const response = await updateSession(request);
    
    // updateSession 関数内で認証チェックが行われ、
    // ユーザーが認証されていない場合は /login にリダイレクトされる
    // API ルートの場合は、リダイレクトではなく JSON エラーレスポンスを返す
    if (response.status === 307 && response.headers.get('location')?.includes('/login')) {
      const response = NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
      return setCorsHeaders(request, response);
    }
    
    // API ルートの場合は、レスポンスにCORSヘッダーを追加
    return setCorsHeaders(request, response);
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
