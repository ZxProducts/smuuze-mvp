import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const teamId = params.id;
    
    // チーム情報を取得
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, description')
      .eq('id', teamId)
      .single();
      
    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ team });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'チーム情報の取得に失敗しました' },
      { status: 500 }
    );
  }
} 