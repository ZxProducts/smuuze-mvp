import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();
    
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'メールアドレス、パスワード、氏名は必須です' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerSupabaseClient();
    
    // ユーザー登録
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    if (authData.user) {
      // プロフィール情報を登録
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          role: 'member',
          email: email,
        });
      
      if (profileError) {
        return NextResponse.json(
          { error: profileError.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '登録に失敗しました' },
      { status: 500 }
    );
  }
}
