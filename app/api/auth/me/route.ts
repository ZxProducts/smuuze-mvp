import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 現在のユーザー情報を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーのセッションを取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // ユーザー情報を取得
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      user: {
        ...user,
        id: session.user.id,
        email: session.user.email
      } 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
