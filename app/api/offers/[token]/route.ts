import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// オファーの取得（トークンによる）
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const token = params.token;
    
    // オファーを取得
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        teams:team_id (
          id,
          name,
          description
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single();
    
    if (offerError) {
      return NextResponse.json(
        { error: offerError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ offer });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'オファーの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// オファーの承諾
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
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
    const token = params.token;
    
    // オファーを取得
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();
    
    if (offerError) {
      return NextResponse.json(
        { error: offerError.message },
        { status: 400 }
      );
    }
    
    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }
    
    // オファーのメールアドレスとユーザーのメールアドレスが一致するか確認
    if (profile.email !== offer.email) {
      return NextResponse.json(
        { error: 'このオファーは別のメールアドレス宛てに送信されています' },
        { status: 403 }
      );
    }
    
    // トランザクション的に処理
    // 1. オファーのステータスを更新
    const { error: updateError } = await supabase
      .from('offers')
      .update({ status: 'accepted' })
      .eq('id', offer.id);
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }
    
    // 2. チームメンバーとして追加
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: offer.team_id,
        user_id: userId,
        hourly_rate: offer.hourly_rate,
        daily_work_hours: offer.daily_work_hours,
        weekly_work_days: offer.weekly_work_days,
        meeting_included: offer.meeting_included,
        notes: offer.notes,
        role: 'member',
      })
      .select()
      .single();
    
    if (memberError) {
      // チームメンバーの追加に失敗した場合、オファーのステータスを元に戻す
      await supabase
        .from('offers')
        .update({ status: 'pending' })
        .eq('id', offer.id);
      
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'オファーの承諾に失敗しました' },
      { status: 500 }
    );
  }
}

// オファーの拒否
export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
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
    const token = params.token;
    
    // オファーを取得
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();
    
    if (offerError) {
      return NextResponse.json(
        { error: offerError.message },
        { status: 400 }
      );
    }
    
    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }
    
    // オファーのメールアドレスとユーザーのメールアドレスが一致するか確認
    if (profile.email !== offer.email) {
      return NextResponse.json(
        { error: 'このオファーは別のメールアドレス宛てに送信されています' },
        { status: 403 }
      );
    }
    
    // オファーのステータスを更新
    const { error: updateError } = await supabase
      .from('offers')
      .update({ status: 'rejected' })
      .eq('id', offer.id);
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'オファーの拒否に失敗しました' },
      { status: 500 }
    );
  }
}
