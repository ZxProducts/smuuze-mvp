import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { format, parseISO, getYear, getMonth } from 'date-fns';

// 時間をフォーマットする関数（秒数から時間分形式に変換）
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  return `${String(hours).padStart(2, '0')}時間${String(minutes).padStart(2, '0')}分`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    
    // 当月の開始日と終了日を計算
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScriptの月は0から始まるため+1
    const lastDay = new Date(currentYear, currentMonth, 0).getDate(); // 月の最終日
    
    // デフォルトは当月（現在の月の1日から月末）
    const defaultStartDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const defaultEndDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const startDate = searchParams.get('startDate') || defaultStartDate;
    const endDate = searchParams.get('endDate') || defaultEndDate;
    const projectId = searchParams.get('projectId');
    const teamId = searchParams.get('teamId');
    
    console.log("期間:", startDate, "から", endDate);
    
    // ユーザーが所属するチームを取得
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);
    
    const teamIds = teamMembers?.map(member => member.team_id) || [];
    
    if (teamIds.length === 0) {
      // ユーザーがどのチームにも所属していない場合は空のデータを返す
      return NextResponse.json({
        totalTime: "00時間00分",
        topProject: null,
        topClient: null,
        monthlyData: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, totalHours: 0 })),
        projectBreakdown: []
      });
    }
    
    // チームに所属するプロジェクトを取得
    const { data: teamProjects } = await supabase
      .from('projects')
      .select('id')
      .in('team_id', teamIds);
    
    const projectIds = teamProjects?.map(project => project.id) || [];
    
    // 基本クエリを構築 - 自分のチームのプロジェクトに関連するすべてのタイムエントリーを取得
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        projects:project_id (
          id,
          name,
          team_id
        ),
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .in('project_id', projectIds)
      .gte('start_time', startDate)
      .lte('start_time', endDate);
    
    // フィルタリング条件を追加
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    // チームIDでフィルタリング
    if (teamId) {
      // 特定のチームのプロジェクトに絞り込む
      const { data: teamProjectIds } = await supabase
        .from('projects')
        .select('id')
        .eq('team_id', teamId);
      
      const filteredProjectIds = teamProjectIds?.map(project => project.id) || [];
      query = query.in('project_id', filteredProjectIds);
    }
    
    // タイムエントリーを取得
    const { data: timeEntries, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // 合計時間を計算
    let totalSeconds = 0;
    
    // プロジェクトごとの時間を集計
    const projectTimes: { [key: string]: { id: string, name: string, seconds: number } } = {};
    
    // ユーザーごとの時間を集計
    const userTimes: { [key: string]: { id: string, name: string, seconds: number } } = {};
    
    // 月ごとの時間を集計（1月から12月まで）
    const monthlyData: { [key: number]: number } = {};
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = 0;
    }
    
    // 各タイムエントリーを処理
    timeEntries?.forEach(entry => {
      if (!entry.start_time) return;
      
      const startTime = new Date(entry.start_time);
      let endTime: Date;
      
      if (entry.end_time) {
        endTime = new Date(entry.end_time);
      } else {
        // 進行中のエントリーは現在時刻までの時間を計算
        endTime = new Date();
      }
      
      // 休憩時間を考慮（秒に変換）
      const breakSeconds = (entry.break_minutes || 0) * 60;
      
      // 時間の差を計算（ミリ秒を秒に変換）
      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - breakSeconds;
      
      if (durationInSeconds > 0) {
        totalSeconds += durationInSeconds;
        
        // プロジェクトごとの時間を集計
        const projectId = entry.project_id;
        const projectName = entry.projects?.name || 'Unknown';
        
        if (!projectTimes[projectId]) {
          projectTimes[projectId] = {
            id: projectId,
            name: projectName,
            seconds: 0
          };
        }
        
        projectTimes[projectId].seconds += durationInSeconds;
        
        // ユーザーごとの時間を集計
        const userId = entry.user_id;
        const userName = entry.profiles?.full_name || 'Unknown';
        
        if (!userTimes[userId]) {
          userTimes[userId] = {
            id: userId,
            name: userName,
            seconds: 0
          };
        }
        
        userTimes[userId].seconds += durationInSeconds;
        
        // 月ごとの時間を集計
        const month = getMonth(startTime) + 1; // 0-indexed to 1-indexed
        monthlyData[month] += durationInSeconds / 3600; // 秒を時間に変換
      }
    });
    
    // デバッグ用：月別データの確認
    console.log("月別データ（集計前）:", monthlyData);
    
    // プロジェクト時間の配列を作成し、時間の降順でソート
    const projectBreakdown = Object.values(projectTimes)
      .map(project => ({
        id: project.id,
        name: project.name,
        totalTime: formatDuration(project.seconds),
        totalSeconds: project.seconds,
        percentage: totalSeconds > 0 ? (project.seconds / totalSeconds) * 100 : 0
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
    
    // ユーザー時間の配列を作成し、時間の降順でソート
    const userBreakdown = Object.values(userTimes)
      .map(user => ({
        id: user.id,
        name: user.name,
        totalTime: formatDuration(user.seconds),
        totalSeconds: user.seconds,
        percentage: totalSeconds > 0 ? (user.seconds / totalSeconds) * 100 : 0
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
    
    // トッププロジェクトを特定
    const topProject = projectBreakdown.length > 0 ? {
      id: projectBreakdown[0].id,
      name: projectBreakdown[0].name
    } : null;
    
    // 月別データを配列に変換
    const monthlyDataArray = Object.entries(monthlyData).map(([month, hours]) => ({
      month: parseInt(month),
      totalHours: hours
    }));
    
    // レスポンスを構築
    const response = {
      totalTime: formatDuration(totalSeconds),
      topProject,
      topClient: null, // 現在のデータモデルではクライアント情報がないため
      monthlyData: monthlyDataArray,
      projectBreakdown,
      userBreakdown
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'ダッシュボードデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}
