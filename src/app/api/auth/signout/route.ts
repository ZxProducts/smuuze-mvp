import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/supabase-server';
import { ApiResponse, ErrorResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // サインアウト処理
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error('サインアウトエラー:', {
        name: signOutError.name,
        message: signOutError.message,
        status: signOutError.status
      });

      const errorResponse: ErrorResponse = {
        error: 'サインアウトに失敗しました',
        status: 500,
        details: signOutError
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const response: ApiResponse<{ message: string }> = {
      data: { message: 'サインアウトが完了しました' }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('サインアウト処理エラー:', error);
    const errorResponse: ErrorResponse = {
      error: '予期しないエラーが発生しました',
      status: 500,
      details: error
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}