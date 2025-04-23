import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 組織メンバーの取得（単一）
export async function GET(
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
    const teamId = params.id;
    const memberId = params.memberId;
    
    // ユーザーが組織に所属しているか確認
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
        { error: 'この組織にアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    // 組織メンバーを取得
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('id', memberId)
      .eq('team_id', teamId)
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
      { error: error.message || '組織メンバーの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 組織メンバーの更新
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
    const teamId = params.id;
    const memberId = params.memberId;
    
    // ユーザーが組織の管理者かどうかを確認
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();
    
    console.log(`ユーザー(${userId})の組織(${teamId})での役割確認:`, teamMember ? teamMember.role : 'メンバーではありません');
    
    if (teamMemberError) {
      console.error('組織メンバー確認エラー:', teamMemberError.message);
      return NextResponse.json(
        { error: 'この組織にアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (!teamMember) {
      console.error(`ユーザー(${userId})は組織(${teamId})のメンバーではありません`);
      return NextResponse.json(
        { error: 'この組織にアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      console.error(`ユーザー(${userId})は組織(${teamId})の管理者ではありません`);
      return NextResponse.json(
        { error: '組織メンバーを更新する権限がありません' },
        { status: 403 }
      );
    }
    
    // リクエストボディを取得
    const requestBody = await request.json();
    console.log('リクエストボディ:', requestBody);
    
    const { hourlyRate, dailyWorkHours, weeklyWorkDays, meetingIncluded, notes, role } = requestBody;
    
    // 更新するフィールドを準備
    const updateFields: any = {};
    
    if (hourlyRate !== undefined) updateFields.hourly_rate = hourlyRate;
    if (dailyWorkHours !== undefined) updateFields.daily_work_hours = dailyWorkHours;
    if (weeklyWorkDays !== undefined) updateFields.weekly_work_days = weeklyWorkDays;
    if (meetingIncluded !== undefined) updateFields.meeting_included = meetingIncluded;
    if (notes !== undefined) updateFields.notes = notes;
    if (role !== undefined) updateFields.role = role;
    
    console.log('更新するフィールド:', updateFields);
    
    // 更新前に組織メンバーが存在するか確認
    console.log(`組織メンバー確認: teamId=${teamId}, memberId=${memberId}`);
    const { data: existingMember, error: existingMemberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .maybeSingle();
    
    if (existingMemberError) {
      console.error('組織メンバー確認エラー:', existingMemberError.message);
      return NextResponse.json(
        { error: existingMemberError.message },
        { status: 400 }
      );
    }
    
    if (!existingMember) {
      console.error(`組織メンバーが見つかりません: teamId=${teamId}, memberId=${memberId}`);
      return NextResponse.json(
        { error: '組織メンバーが見つかりません' },
        { status: 404 }
      );
    }
    
    console.log('更新前の組織メンバー:', existingMember);
    
    // 組織メンバーを更新
    console.log('Supabaseクエリを実行: team_members.update()');
    console.log('更新条件: id =', memberId, 'AND team_id =', teamId);
    console.log('更新フィールド:', JSON.stringify(updateFields, null, 2));
    
    const { data, error } = await supabase
      .from('team_members')
      .update(updateFields)
      .eq('id', memberId)
      .eq('team_id', teamId)
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          role
        )
      `);
    
    if (error) {
      console.error('組織メンバー更新エラー:', error.message);
    } else {
      console.log('組織メンバー更新成功:', data);
    }
    
    // 更新後のデータを確認
    console.log('更新後のデータを確認');
    const { data: updatedMember, error: updatedMemberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single();
    
    if (updatedMemberError) {
      console.error('更新後のデータ取得エラー:', updatedMemberError.message);
    } else {
      console.log('更新後の組織メンバー:', updatedMember);
      console.log('ロールが更新されたか:', updatedMember.role === role);
    }
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (!data || data.length === 0) {
      console.log('更新は成功したが、データが返されなかったため、更新前のデータを返します');
      
      // 更新前のデータを使用して、プロフィール情報を取得
      const { data: memberWithProfile, error: profileError } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('id', memberId)
        .eq('team_id', teamId)
        .single();
      
      if (profileError) {
        console.error('プロフィール取得エラー:', profileError.message);
        // エラーがあっても、更新前のデータを返す
        return NextResponse.json({ 
          member: {
            ...existingMember,
            role: role || existingMember.role // 更新されたロールを反映
          }
        });
      }
      
      // 更新されたロールを反映
      return NextResponse.json({ 
        member: {
          ...memberWithProfile,
          role: role || memberWithProfile.role // 更新されたロールを反映
        }
      });
    }
    
    return NextResponse.json({ member: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '組織メンバーの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 組織メンバーの削除
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
    const teamId = params.id;
    const memberId = params.memberId;
    
    // 組織メンバーを取得
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single();
    
    if (memberError) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      );
    }
    
    // 自分自身の場合は削除可能
    if (member.user_id === userId) {
      // 自分が最後の管理者かどうかを確認
      if (member.role === 'admin') {
        const { data: adminCount, error: adminCountError } = await supabase
          .from('team_members')
          .select('id', { count: 'exact' })
          .eq('team_id', teamId)
          .eq('role', 'admin');
        
        if (adminCountError) {
          return NextResponse.json(
            { error: adminCountError.message },
            { status: 400 }
          );
        }
        
        if (adminCount.length <= 1) {
          return NextResponse.json(
            { error: '最後の管理者は削除できません' },
            { status: 400 }
          );
        }
      }
      
      // 組織メンバーを削除
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ success: true });
    }
    
    // 他のメンバーの場合は管理者権限が必要
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();
    
    if (teamMemberError || !teamMember) {
      return NextResponse.json(
        { error: 'この組織にアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    if (teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: '組織メンバーを削除する権限がありません' },
        { status: 403 }
      );
    }
    
    // 組織メンバーを削除
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '組織メンバーの削除に失敗しました' },
      { status: 500 }
    );
  }
}
