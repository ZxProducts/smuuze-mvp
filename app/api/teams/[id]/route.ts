import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// チームの取得（単一）
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
    const teamId = params.id;
    
    // ユーザーがチームに所属しているか確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();
    
    if (teamMemberError) {
      return NextResponse.json(
        { error: teamMemberError.message },
        { status: 400 }
      );
    }
    
    if (!teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    // チームを取得
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          id,
          user_id,
          role,
          hourly_rate,
          daily_work_hours,
          weekly_work_days,
          meeting_included,
          notes,
          joined_at,
          profiles:user_id (
            id,
            full_name,
            email
          )
        ),
        projects (
          id,
          name,
          description,
          start_date,
          end_date
        )
      `)
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
      { error: error.message || 'チームの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// チームの更新
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
    const teamId = params.id;
    
    // ユーザーがチームの管理者かどうかを確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();
    
    if (teamMemberError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'チームを更新する権限がありません' },
        { status: 403 }
      );
    }
    
    // リクエストボディを取得
    const { 
      name, 
      description, 
      postal_code, 
      prefecture, 
      city, 
      address1, 
      address2 
    } = await request.json();
    
    // 更新するフィールドを準備
    const updateFields: any = {};
    
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (postal_code !== undefined) updateFields.postal_code = postal_code;
    if (prefecture !== undefined) updateFields.prefecture = prefecture;
    if (city !== undefined) updateFields.city = city;
    if (address1 !== undefined) updateFields.address1 = address1;
    if (address2 !== undefined) updateFields.address2 = address2;
    
    // チームを更新
    const { data, error } = await supabase
      .from('teams')
      .update(updateFields)
      .eq('id', teamId)
      .select();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'チームが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ team: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'チームの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// チームの削除
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
    const teamId = params.id;
    
    // ユーザーがチームの管理者かどうかを確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();
    
    if (teamMemberError || !teamMember) {
      return NextResponse.json(
        { error: 'このチームにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'チームを削除する権限がありません' },
        { status: 403 }
      );
    }
    
    // チームを削除
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'チームの削除に失敗しました' },
      { status: 500 }
    );
  }
}
