import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// プロフィール更新用の型定義
interface ProfileUpdateData {
  full_name?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_type?: string;
  bank_branch_name?: string;
  bank_branch_code?: string;
  invoice_notes?: string;
}

// 現在のユーザー情報を取得
export async function GET(request: NextRequest) {
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
    
    // ユーザー情報を取得
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      user: {
        ...user,
        id: session.user.id,
        email: session.user.email
      } 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ユーザープロフィールを更新
export async function PUT(request: NextRequest) {
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
    
    // リクエストボディからデータを取得
    const data: ProfileUpdateData = await request.json();
    
    // 更新するフィールドを準備
    const updateData: ProfileUpdateData = {};
    
    // 送信されたフィールドのみを更新対象に含める
    if (data.full_name !== undefined) updateData.full_name = data.full_name;
    if (data.postal_code !== undefined) updateData.postal_code = data.postal_code;
    if (data.prefecture !== undefined) updateData.prefecture = data.prefecture;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.address1 !== undefined) updateData.address1 = data.address1;
    if (data.address2 !== undefined) updateData.address2 = data.address2;
    
    // 銀行口座情報
    if (data.bank_name !== undefined) updateData.bank_name = data.bank_name;
    if (data.bank_account_number !== undefined) updateData.bank_account_number = data.bank_account_number;
    if (data.bank_account_type !== undefined) updateData.bank_account_type = data.bank_account_type;
    if (data.bank_branch_name !== undefined) updateData.bank_branch_name = data.bank_branch_name;
    if (data.bank_branch_code !== undefined) updateData.bank_branch_code = data.bank_branch_code;
    
    // 請求書備考
    if (data.invoice_notes !== undefined) updateData.invoice_notes = data.invoice_notes;
    
    // プロフィールを更新
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', session.user.id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      user: {
        ...updatedProfile,
        id: session.user.id,
        email: session.user.email
      } 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}
