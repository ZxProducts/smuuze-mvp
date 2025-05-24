import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // リクエストボディを取得
    const { email, password, fullName, redirectTo } = await request.json();
    
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }
    
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
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'ユーザー登録に失敗しました' },
        { status: 400 }
      );
    }
    
    // プロフィール作成
    console.log('Creating profile with user ID:', authData.user.id, 'and email:', email);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        email,
        role: 'member',
      });
    
    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
} 