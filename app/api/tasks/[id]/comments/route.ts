import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// タスクコメントの取得
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
    const taskId = params.id;
    
    // タスクを取得
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('team_id')
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがタスクのチームに所属しているか確認
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', task.team_id)
      .maybeSingle();
    
    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
        { status: 400 }
      );
    }
    
    if (!teamMember) {
      return NextResponse.json(
        { error: 'このタスクにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    // タスクコメントを取得
    const { data: comments, error: commentsError } = await supabase
      .from('task_comments')
      .select(`
        *,
        author:author_id (
          id,
          full_name,
          email
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    
    if (commentsError) {
      return NextResponse.json(
        { error: commentsError.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ comments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タスクコメントの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// タスクコメントの作成
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
    const taskId = params.id;
    
    // タスクを取得
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('team_id')
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 400 }
      );
    }
    
    // ユーザーがタスクのチームに所属しているか確認
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', task.team_id)
      .maybeSingle();
    
    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
        { status: 400 }
      );
    }
    
    if (!teamMember) {
      return NextResponse.json(
        { error: 'このタスクにアクセスする権限がありません' },
        { status: 403 }
      );
    }
    
    // リクエストボディを取得
    const { comment } = await request.json();
    
    if (!comment) {
      return NextResponse.json(
        { error: 'コメントは必須です' },
        { status: 400 }
      );
    }
    
    // タスクコメントを作成
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        author_id: userId,
        comment,
      })
      .select(`
        *,
        author:author_id (
          id,
          full_name,
          email
        )
      `)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ comment: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'タスクコメントの作成に失敗しました' },
      { status: 500 }
    );
  }
}
