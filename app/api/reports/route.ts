import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';

// 時間をフォーマットする関数（秒数から時:分:秒形式に変換）
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 認証済みユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('認証エラー:', userError);
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const teamIdsParam = searchParams.get('teamIds');
    const projectIdsParam = searchParams.get('projectIds');
    const taskIdsParam = searchParams.get('taskIds');
    const userIdsParam = searchParams.get('userIds');
    
    // カンマ区切りの文字列を配列に変換
    const teamIds = teamIdsParam ? teamIdsParam.split(',') : [];
    const projectIds = projectIdsParam ? projectIdsParam.split(',') : [];
    const taskIds = taskIdsParam ? taskIdsParam.split(',') : [];
    const userIds = userIdsParam ? userIdsParam.split(',') : [];
    
    const startDate = searchParams.get('startDate') || format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const endDate = searchParams.get('endDate') || format(endOfWeek(new Date()), 'yyyy-MM-dd');
    
    console.log('レポートAPI呼び出し:', {
      userId: user.id,
      teamIds,
      projectIds,
      taskIds,
      userIds,
      startDate,
      endDate
    });
    
    // ユーザーが所属するチームを取得
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);
    
    if (teamError) {
      console.error('チーム取得エラー:', teamError);
      return NextResponse.json(
        { error: 'チーム情報の取得に失敗しました: ' + teamError.message },
        { status: 500 }
      );
    }
    
    if (!teamMembers || teamMembers.length === 0) {
      console.log('ユーザーはチームに所属していません:', user.id);
      return NextResponse.json({
        totalTime: "00:00:00",
        entries: [],
        projectBreakdown: []
      });
    }
    
    // ユーザーが所属するチームIDのリスト
    const userTeamIds = teamMembers.map(member => member.team_id);
    
    // フィルタリング用のチームID
    // 指定されたチームIDがある場合はそれを使用、なければユーザーの所属チームをすべて使用
    const filterTeamIds = teamIds.length > 0 ? teamIds : userTeamIds;
    
    // チームに所属するプロジェクトを取得
    let projectQuery = supabase
      .from('projects')
      .select('id')
      .in('team_id', filterTeamIds);
    
    const { data: teamProjects, error: projectError } = await projectQuery;
    
    if (projectError) {
      console.error('プロジェクト取得エラー:', projectError);
      return NextResponse.json(
        { error: 'プロジェクト情報の取得に失敗しました: ' + projectError.message },
        { status: 500 }
      );
    }
    
    if (!teamProjects || teamProjects.length === 0) {
      console.log('チームにプロジェクトがありません:', filterTeamIds);
      return NextResponse.json({
        totalTime: "00:00:00",
        entries: [],
        projectBreakdown: []
      });
    }
    
    // プロジェクトIDのリスト
    // 指定されたプロジェクトIDがある場合はそれを使用、なければチームのプロジェクトをすべて使用
    const allProjectIds = teamProjects.map(project => project.id);
    const filterProjectIds = projectIds.length > 0 ? projectIds : allProjectIds;
    
    // タイムエントリーを取得するクエリを構築
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        projects:project_id (
          id,
          name,
          team_id
        ),
        tasks:task_id (
          id,
          title
        ),
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .in('project_id', filterProjectIds)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: false });
    
    // タスクIDでフィルタリング（複数選択可能）
    if (taskIds.length > 0) {
      query = query.in('task_id', taskIds);
    }
    
    // ユーザーIDでフィルタリング（複数選択可能）
    if (userIds.length > 0) {
      query = query.in('user_id', userIds);
    }
    
    const { data: timeEntries, error } = await query;
    
    if (error) {
      console.error('タイムエントリー取得エラー:', error);
      return NextResponse.json(
        { error: 'タイムエントリーの取得に失敗しました: ' + error.message },
        { status: 400 }
      );
    }
    
    // 合計時間とプロジェクトごとの集計を計算
    let totalSeconds = 0;
    const projectTimes: { [key: string]: { id: string; name: string; seconds: number } } = {};
    
    timeEntries?.forEach(entry => {
      if (!entry.start_time) return;
      
      const startTime = new Date(entry.start_time);
      let endTime: Date;
      
      if (entry.end_time) {
        endTime = new Date(entry.end_time);
      } else {
        endTime = new Date();
      }
      
      const breakSeconds = (entry.break_minutes || 0) * 60;
      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - breakSeconds;
      
      if (durationInSeconds > 0) {
        totalSeconds += durationInSeconds;
        
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
      }
    });
    
    // プロジェクト別の集計を作成
    const projectBreakdown = Object.values(projectTimes)
      .map(project => ({
        id: project.id,
        name: project.name,
        totalTime: formatDuration(project.seconds),
        totalSeconds: project.seconds,
        percentage: totalSeconds > 0 ? (project.seconds / totalSeconds) * 100 : 0
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
    
    // タイムエントリーを整形
    const formattedEntries = timeEntries?.map(entry => {
      const startTime = new Date(entry.start_time);
      const endTime = entry.end_time ? new Date(entry.end_time) : new Date();
      const breakSeconds = (entry.break_minutes || 0) * 60;
      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - breakSeconds;
      
      return {
        id: entry.id,
        projectId: entry.project_id,
        projectName: entry.projects?.name,
        taskId: entry.task_id,
        taskTitle: entry.tasks?.title,
        userId: entry.user_id,
        userName: entry.profiles?.full_name,
        startTime: entry.start_time,
        endTime: entry.end_time,
        duration: formatDuration(durationInSeconds),
        description: entry.description
      };
    });
    
    return NextResponse.json({
      totalTime: formatDuration(totalSeconds),
      entries: formattedEntries,
      projectBreakdown
    });
    
  } catch (error: any) {
    console.error('レポートAPI例外:', error);
    return NextResponse.json(
      { error: error.message || 'レポートデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}
