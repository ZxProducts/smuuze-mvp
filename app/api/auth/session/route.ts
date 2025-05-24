import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false }
      );
    }
    
    // セッション情報はクライアントに必要な情報のみを返す
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'セッション取得に失敗しました' },
      { status: 500 }
    );
  }
} 