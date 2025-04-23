import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// プロジェクトメンバーの取得
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
      .select('team_id')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      return NextResponse.json(
        { error: projectError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがプロジェクトの組織に所属しているか確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .maybeSingle();
    
    if (teamMemberError) {
      return NextResponse.json(
        { error: teamMemberError.message },
        { status: 400 }
      );
    }
    
    if (!teamMember) {
      return NextResponse.json(
        { error: 'このプロジェクトにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    // プロジェクトメンバーを取得
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('project_id', projectId);
    
    if (membersError) {
      return NextResponse.json(
        { error: membersError.message },
        { status: 400 }
      );
    }
    
    // 組織メンバーを取得（プロジェクトに追加可能なメンバー一覧用）
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('team_id', project.team_id);
    
    if (teamMembersError) {
      return NextResponse.json(
        { error: teamMembersError.message },
        { status: 400 }
      );
    }
    
    // プロジェクトメンバーのユーザーIDを抽出
    const projectMemberUserIds = members.map((member: any) => member.user_id);
    
    // プロジェクトに追加可能な組織メンバー（まだプロジェクトに追加されていないメンバー）
    const availableMembers = teamMembers.filter((member: any) => 
      !projectMemberUserIds.includes(member.user_id)
    );
    
    return NextResponse.json({ 
      members, 
      availableMembers,
      isAdmin: teamMember.role === 'admin',
      teamId: project.team_id
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロジェクトメンバーの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// プロジェクトメンバーの追加
export async function POST(
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
    
    // ユーザーが組織の管理者かどうかを確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .single();
    
    if (teamMemberError || !teamMember) {
      return NextResponse.json(
        { error: 'この組織にアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'プロジェクトメンバーを追加する権限がありません' },
        { status: 403 }
      );
    }
    
    // リクエストボディを取得
    const { userId: memberUserId, hourlyRate } = await request.json();
    
    if (!memberUserId) {
      return NextResponse.json(
        { error: 'ユーザーIDは必須です' },
        { status: 400 }
      );
    }
    
    // ユーザーが組織に所属しているか確認
    const { data: userTeamMember, error: userTeamMemberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', memberUserId)
      .eq('team_id', project.team_id)
      .maybeSingle();
    
    if (userTeamMemberError) {
      return NextResponse.json(
        { error: userTeamMemberError.message },
        { status: 400 }
      );
    }
    
    if (!userTeamMember) {
      return NextResponse.json(
        { error: 'このユーザーは組織に所属していません' },
        { status: 400 }
      );
    }
    
    // 既にプロジェクトメンバーかどうかを確認
    const { data: existingMember, error: existingMemberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', memberUserId)
      .maybeSingle();
    
    if (existingMemberError) {
      return NextResponse.json(
        { error: existingMemberError.message },
        { status: 400 }
      );
    }
    
    if (existingMember) {
      return NextResponse.json(
        { error: 'このユーザーは既にプロジェクトメンバーです' },
        { status: 400 }
      );
    }
    
    // プロジェクトメンバーとして追加
    // 組織メンバーの単価をデフォルト値として使用
    const actualHourlyRate = hourlyRate !== undefined ? hourlyRate : userTeamMember.hourly_rate;
    
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberUserId,
        hourly_rate: actualHourlyRate
      })
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
      { error: error.message || 'プロジェクトメンバーの追加に失敗しました' },
      { status: 500 }
    );
  }
}
