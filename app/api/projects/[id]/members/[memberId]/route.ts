import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// プロジェクトメンバーの更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
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
    
    const userId = session.user.id;
    const projectId = params.id;
    const memberId = params.memberId;
    
    // プロジェクトを取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      return NextResponse.json(
        { error: projectError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがチームの管理者かどうかを確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .single();
    
    if (teamMemberError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'プロジェクトメンバーを更新する権限がありません' },
        { status: 403 }
      );
    }
    
    // リクエストボディを取得
    const { hourlyRate } = await request.json();
    
    if (hourlyRate === undefined || hourlyRate < 0) {
      return NextResponse.json(
        { error: '有効な単価を指定してください' },
        { status: 400 }
      );
    }
    
    // プロジェクトメンバーを更新
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .update({
        hourly_rate: hourlyRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('project_id', projectId)
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .single();
    
    if (memberError) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ member });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロジェクトメンバーの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// プロジェクトメンバーの削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
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
    
    const userId = session.user.id;
    const projectId = params.id;
    const memberId = params.memberId;
    
    // プロジェクトを取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      return NextResponse.json(
        { error: projectError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがチームの管理者かどうかを確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .single();
    
    if (teamMemberError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'プロジェクトメンバーを削除する権限がありません' },
        { status: 403 }
      );
    }
    
    // プロジェクトメンバーを削除
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)
      .eq('project_id', projectId);
    
    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロジェクトメンバーの削除に失敗しました' },
      { status: 500 }
    );
  }
}
