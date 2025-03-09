import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

export async function middleware(request: NextRequest) {
  // API ルートへのリクエストかどうかを確認
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  
  // API ルートへのリクエストの場合は、認証チェックを行い、
  // 認証されていない場合は JSON エラーレスポンスを返す
  if (isApiRoute && !request.nextUrl.pathname.startsWith('/api/auth')) {
    const response = await updateSession(request);
    
    // updateSession 関数内で認証チェックが行われ、
    // ユーザーが認証されていない場合は /login にリダイレクトされる
    // API ルートの場合は、リダイレクトではなく JSON エラーレスポンスを返す
    if (response.status === 307 && response.headers.get('location')?.includes('/login')) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    return response;
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
