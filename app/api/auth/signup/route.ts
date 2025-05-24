import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // リクエストボディを取得
    // emailRedirectBaseUrl はメール認証後にリダイレクトするベースURL (例: https://example.com/auth/callback)
    const { email, password, fullName, invitationToken, emailRedirectBaseUrl } = await request.json(); 
    
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    const redirectUrl = new URL(emailRedirectBaseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000/auth/callback');
    redirectUrl.searchParams.append('email', email);
    if (invitationToken) {
      redirectUrl.searchParams.append('invitationToken', invitationToken);
    }
    
    // ユーザー登録
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl.toString(),
        // 必要に応じて、ユーザーのメタデータとして招待情報を保存することも可能
        // data: {
        //   invitation_token: invitationToken,
        //   full_name: fullName // プロフィール情報は別途作成するので不要かもしれない
        // }
      }
    });
    
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'ユーザー登録に失敗しました' },
        { status: 400 }
      );
    }
    
    // プロフィール作成
    // メール認証前にプロフィールを作成するが、RLSポリシーで制限されている場合は
    // メール認証後のフロー (例: confirm-invitation API) で作成/更新することも検討
    console.log('Creating profile with user ID:', authData.user.id, 'and email:', email);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        email,
        role: 'member', // 初期ロール。招待によって変わる可能性も考慮
      });
    
    if (profileError) {
      // プロフィール作成に失敗した場合、Authユーザーを削除することを検討
      // await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Failed to create profile:', profileError);
      return NextResponse.json(
        { error: `プロフィール作成に失敗しました: ${profileError.message}` },
        { status: 400 }
      );
    }

    // 組織への自動追加処理はここから削除
    
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        // session: authData.session // signUp直後はsessionがnullの場合があるので注意
      },
      // クライアントにメール確認を促すメッセージを返す
      message: '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。'
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
} 