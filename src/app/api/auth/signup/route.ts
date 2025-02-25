import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import {
  SignupRequest,
  SignupResponse,
  ErrorResponse,
  ApiResponse
} from '@/types/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name }: SignupRequest = await request.json();

    // バリデーション
    if (!email || !password) {
      const errorResponse: ErrorResponse = {
        error: 'メールアドレスとパスワードは必須です',
        status: 400
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const supabase = await createClient();

    // サインアップ処理
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || email.split('@')[0]
        }
      }
    });

    if (signUpError) {
      console.error('サインアップエラー:', signUpError);
      const errorResponse: ErrorResponse = {
        error: 'アカウントの作成に失敗しました',
        status: 500,
        details: signUpError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: 'ユーザーの作成に失敗しました',
        status: 500
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const now = new Date().toISOString();

    // プロフィールの作成
    const { error: profileError } = await (await supabase)
      .from('profiles')
      .insert([
        {
          id: user.id,
          full_name: full_name || email.split('@')[0],
          email: email,
          created_at: now,
          updated_at: now
        }
      ]);

    if (profileError) {
      console.error('プロフィール作成エラー:', profileError);
      // プロフィール作成エラーは致命的ではないため、警告のみ
    }

    const response: ApiResponse<SignupResponse> = {
      data: {
        message: '確認メールを送信しました。メールを確認してアカウントを有効化してください。',
        user: {
          id: user.id,
          email: user.email!,
          full_name: full_name || email.split('@')[0]
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('サインアップ処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}