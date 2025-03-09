import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// プロジェクトの取得（単一）
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
    
    const userId = session.user.id;
    const projectId = params.id;
    
    // プロジェクトを取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        teams:team_id (
          id,
          name
        )
      `)
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      return NextResponse.json(
        { error: projectError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがプロジェクトのチームに所属しているか確認
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .maybeSingle();
    
    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
        { status: 400 }
      );
    }
    
    if (!teamMember) {
      return NextResponse.json(
        { error: 'このプロジェクトにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロジェクトの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// プロジェクトの更新
export async function PUT(
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
    
    const userId = session.user.id;
    const projectId = params.id;
    
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
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .single();
    
    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'プロジェクトを更新する権限がありません' },
        { status: 403 }
      );
    }
    
    // リクエストボディを取得
    const { name, description, startDate, endDate } = await request.json();
    
    // 更新するフィールドを準備
    const updateFields: any = {};
    
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (startDate !== undefined) updateFields.start_date = startDate;
    if (endDate !== undefined) updateFields.end_date = endDate;
    
    // プロジェクトを更新
    const { data, error } = await supabase
      .from('projects')
      .update(updateFields)
      .eq('id', projectId)
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'プロジェクトが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ project: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロジェクトの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// プロジェクトの削除
export async function DELETE(
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
    
    const userId = session.user.id;
    const projectId = params.id;
    
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
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .single();
    
    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'プロジェクトを削除する権限がありません' },
        { status: 403 }
      );
    }
    
    // プロジェクトを削除
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロジェクトの削除に失敗しました' },
      { status: 500 }
    );
  }
}
