import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { password, code } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { error: 'パスワードは必須です' },
        { status: 400 }
      );
    }
    
    if (!code) {
      return NextResponse.json(
        { error: 'リセットコードは必須です' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerSupabaseClient();
    
    // パスワードリセットトークンを使用してセッションを作成
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 400 }
      );
    }
    
    // セッションが作成できたら、パスワードを更新
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // セッションをクリア
    const cookieStore = cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'パスワードの更新に失敗しました' },
      { status: 500 }
    );
  }
}
