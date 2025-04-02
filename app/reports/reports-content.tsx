"use client";

import { useEffect, useState } from "react";
import { Printer, Share2, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addDays, subDays, subWeeks, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

interface TimeEntry {
  id: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string | null;
  duration: string;
  description: string | null;
}

interface ProjectBreakdown {
  id: string;
  name: string;
  totalTime: string;
  totalSeconds: number;
  percentage: number;
  color?: string; // 色情報を追加
}

interface DailyTime {
  date: string;
  totalTime: string;
  totalSeconds: number;
}

interface ReportData {
  totalTime: string;
  entries: TimeEntry[];
  projectBreakdown: ProjectBreakdown[];
  dailyBreakdown?: DailyTime[];
}

interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  email?: string;
}

interface FilterOptions {
  teamIds?: string[];
  projectIds?: string[];
  taskIds?: string[];
  userIds?: string[];
  status?: string;
  description?: string;
}

export function ReportsContent() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date()), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("report");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date())
  });
  const [shouldFetchData, setShouldFetchData] = useState(false);
  
  // チームとプロジェクトのデータ
  const [teams, setTeams] = useState<{id: string, name: string}[]>([]);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [tasks, setTasks] = useState<{id: string, title: string}[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // 選択中のフィルター
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // 日付選択の状態を管理（none: 未選択、start-selected: 開始日選択済み）
  const [dateSelectionState, setDateSelectionState] = useState<'none' | 'start-selected'>('none');
  // 一時的な開始日を保存
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);

  // チームとプロジェクトのデータを取得
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('/api/teams');
        if (response.ok) {
          const data = await response.json();
          setTeams(data.teams || []);
        }
      } catch (error) {
        console.error('チームの取得に失敗しました', error);
      }
    };
    
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('プロジェクトの取得に失敗しました', error);
      }
    };
    
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error('タスクの取得に失敗しました', error);
      }
    };
    
    fetchTeams();
    fetchProjects();
    fetchTasks();
  }, []);
  
  // 初期ロード時に全てのチームを取得
  const [userTeams, setUserTeams] = useState<{id: string, name: string}[]>([]);
  
  // 初期ロード時にユーザーが所属する全てのチームを取得
  useEffect(() => {
    const fetchUserTeams = async () => {
      try {
        const response = await fetch('/api/teams');
        if (response.ok) {
          const data = await response.json();
          setUserTeams(data.teams || []);
        }
      } catch (error) {
        console.error('ユーザーのチーム取得に失敗しました', error);
      }
    };
    
    fetchUserTeams();
  }, []);
  
  // チームメンバーを取得する関数
  const fetchTeamMembersForTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      if (response.ok) {
        const data = await response.json();
        const members = data.members || [];
        
        // チームメンバーデータを整形
        return members.map((member: any) => ({
          id: member.id,
          userId: member.user_id,
          userName: member.profiles?.full_name || 'Unknown',
          email: member.profiles?.email
        }));
      }
    } catch (error) {
      console.error(`チーム ${teamId} のメンバー取得に失敗しました`, error);
    }
    return [];
  };
  
  // チームが選択されたとき、または初期ロード時にチームメンバーを取得
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        let allMembers: TeamMember[] = [];
        
        if (selectedTeamIds.length > 0) {
          // 選択されたチームのメンバーを取得
          for (const teamId of selectedTeamIds) {
            const members = await fetchTeamMembersForTeam(teamId);
            allMembers = [...allMembers, ...members];
          }
        } else if (userTeams.length > 0) {
          // チーム未選択の場合は、ユーザーが所属する全てのチームのメンバーを取得
          for (const team of userTeams) {
            const members = await fetchTeamMembersForTeam(team.id);
            allMembers = [...allMembers, ...members];
          }
        }
        
        // 重複を排除（同じユーザーが複数のチームに所属している場合）
        const uniqueMembers = allMembers.reduce((acc: TeamMember[], current) => {
          const x = acc.find(item => item.userId === current.userId);
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);
        
        setTeamMembers(uniqueMembers);
      } catch (error) {
        console.error('チームメンバーの取得に失敗しました', error);
      }
    };
    
    fetchTeamMembers();
  }, [selectedTeamIds, userTeams]);
  
  // チーム選択の切り替え（複数選択可能）
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamIds(prev => {
      // 既に選択されている場合は削除、そうでなければ追加
      const newSelection = prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId];
      
      // フィルターオプションを更新
      setFilterOptions(prevOptions => ({
        ...prevOptions,
        teamIds: newSelection.length > 0 ? newSelection : undefined
      }));
      
      setShouldFetchData(true);
      return newSelection;
    });
  };
  
  // プロジェクト選択の切り替え（複数選択可能）
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectIds(prev => {
      // 既に選択されている場合は削除、そうでなければ追加
      const newSelection = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      
      // フィルターオプションを更新
      setFilterOptions(prevOptions => ({
        ...prevOptions,
        projectIds: newSelection.length > 0 ? newSelection : undefined
      }));
      
      setShouldFetchData(true);
      return newSelection;
    });
  };
  
  // タスク選択の切り替え（複数選択可能）
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskIds(prev => {
      // 既に選択されている場合は削除、そうでなければ追加
      const newSelection = prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId];
      
      // フィルターオプションを更新
      setFilterOptions(prevOptions => ({
        ...prevOptions,
        taskIds: newSelection.length > 0 ? newSelection : undefined
      }));
      
      setShouldFetchData(true);
      return newSelection;
    });
  };
  
  // メンバー選択の切り替え（複数選択可能）
  const handleMemberSelect = (userId: string) => {
    setSelectedUserIds(prev => {
      // 既に選択されている場合は削除、そうでなければ追加
      const newSelection = prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      
      // フィルターオプションを更新
      setFilterOptions(prevOptions => ({
        ...prevOptions,
        userIds: newSelection.length > 0 ? newSelection : undefined
      }));
      
      setShouldFetchData(true);
      return newSelection;
    });
  };
  
  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      // フィルターオプションをクエリパラメータに変換
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      // 複数選択されたフィルターをカンマ区切りで追加
      if (selectedTeamIds.length > 0) {
        params.append('teamIds', selectedTeamIds.join(','));
      }
      
      if (selectedProjectIds.length > 0) {
        params.append('projectIds', selectedProjectIds.join(','));
      }
      
      if (selectedTaskIds.length > 0) {
        params.append('taskIds', selectedTaskIds.join(','));
      }
      
      if (selectedUserIds.length > 0) {
        params.append('userIds', selectedUserIds.join(','));
      }
      
      console.log('Fetching report data with params:', {
        startDate,
        endDate,
        teamIds: selectedTeamIds,
        projectIds: selectedProjectIds,
        taskIds: selectedTaskIds,
        userIds: selectedUserIds
      });
      
      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || 'レポートデータの取得に失敗しました');
      }
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 日付が選択されたときの処理
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // 開始日選択モードの場合
    if (dateSelectionState === 'none') {
      setTempStartDate(date);
      setDateSelectionState('start-selected');
    } 
    // 終了日選択モードの場合
    else if (tempStartDate) {
      // 開始日より前の日付が選択された場合は、開始日と終了日を入れ替える
      let from = tempStartDate;
      let to = date;
      
      if (date < tempStartDate) {
        from = date;
        to = tempStartDate;
      }
      
      // 週次タブが選択されている場合は、終了日を開始日から6日後に設定
      if (activeTab === "weekly") {
        to = addDays(from, 6);
      }
      
      // 日付範囲を更新
      setDateRange({ from, to });
      setStartDate(format(from, 'yyyy-MM-dd'));
      setEndDate(format(to, 'yyyy-MM-dd'));
      
      // データ取得フラグをON
      setShouldFetchData(true);
      
      // 状態をリセット
      setDateSelectionState('none');
      setTempStartDate(null);
      
      // 注：ポップオーバーを閉じる処理を削除（カレンダーを開いたままにする）
    }
  };
  
  // 日付範囲のプリセット選択
  const selectDatePreset = (preset: string) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;
    
    switch (preset) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case 'thisWeek':
        start = startOfWeek(today);
        end = endOfWeek(today);
        break;
      case 'lastWeek':
        start = startOfWeek(subWeeks(today, 1));
        end = endOfWeek(subWeeks(today, 1));
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        start = startOfWeek(today);
        end = endOfWeek(today);
    }
    
    // 週次タブが選択されている場合は、終了日を開始日から6日後に設定
    if (activeTab === "weekly" && preset !== 'thisWeek' && preset !== 'lastWeek') {
      end = addDays(start, 6);
    }
    
    setDateRange({ from: start, to: end });
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    
    // プリセット選択時は両方の日付が設定されるので、データ取得フラグをON
    setShouldFetchData(true);
  };

  // 初回レンダリング時にデータを取得
  useEffect(() => {
    fetchReportData();
  }, []);
  
  // shouldFetchDataフラグがtrueになったときにデータを取得
  useEffect(() => {
    if (shouldFetchData) {
      fetchReportData();
      setShouldFetchData(false);
    }
  }, [shouldFetchData]);
  
  // タブが変更されたときの処理
  useEffect(() => {
    // 週次タブが選択された場合
    if (activeTab === "weekly") {
      // 現在の日付範囲が一週間かどうかを確認
      const from = new Date(dateRange.from);
      const to = new Date(dateRange.to);
      const diffInDays = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      
      // 日付範囲が6日（一週間）でない場合、開始日を起点に一週間の範囲に設定
      if (diffInDays !== 6) {
        // 開始日はそのままで、終了日を開始日から6日後に設定
        const newEndDate = addDays(from, 6);
        
        setDateRange({ from: from, to: newEndDate });
        setStartDate(format(from, 'yyyy-MM-dd'));
        setEndDate(format(newEndDate, 'yyyy-MM-dd'));
        
        // データ取得フラグをON
        setShouldFetchData(true);
      }
    }
  }, [activeTab]);
  
  // APIレスポンスから日付ごとの合計時間を計算
  useEffect(() => {
    if (reportData && reportData.entries && !reportData.dailyBreakdown) {
      // 日付ごとの合計秒数を計算
      const dailySeconds: { [date: string]: number } = {};
      
      reportData.entries.forEach(entry => {
        if (entry.startTime) {
          const date = format(new Date(entry.startTime), 'yyyy-MM-dd');
          
          // 時間文字列（HH:MM:SS）を秒数に変換
          const durationParts = entry.duration.split(':').map(Number);
          const seconds = (durationParts[0] * 3600) + (durationParts[1] * 60) + (durationParts[2] || 0);
          
          if (!dailySeconds[date]) {
            dailySeconds[date] = 0;
          }
          
          dailySeconds[date] += seconds;
        }
      });
      
      // 秒数を時間文字列（HH:MM:SS）に変換して日次データを生成
      const dailyBreakdown: DailyTime[] = Object.entries(dailySeconds).map(([date, seconds]) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        const totalTime = [
          hours.toString().padStart(2, '0'),
          minutes.toString().padStart(2, '0'),
          remainingSeconds.toString().padStart(2, '0')
        ].join(':');
        
        return {
          date,
          totalTime,
          totalSeconds: seconds
        };
      });
      
      // レポートデータを更新
      setReportData({
        ...reportData,
        dailyBreakdown
      });
    }
  }, [reportData]);
  
  // グループ化の単位
  const [groupBy, setGroupBy] = useState<'project' | 'team' | 'user' | 'month' | 'week' | 'day'>('project');
  
  // ツールチップの状態管理
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: {
      date: string;
      time: string;
    };
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: {
      date: '',
      time: ''
    }
  });

  // フィルターオプションの更新
  const updateFilter = (key: keyof FilterOptions, value: string | undefined) => {
    setFilterOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // グループIDに基づいて一貫した色を生成する関数
  const getColorForGroup = (groupId: string, index: number) => {
    // 定義済みの色のパレット
    const colorPalette = [
      '#3b82f6', // blue-500
      '#ef4444', // red-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#06b6d4', // cyan-500
      '#f97316', // orange-500
      '#14b8a6', // teal-500
      '#6366f1'  // indigo-500
    ];
    
    // グループIDをハッシュ化して色を選択する（同じIDには常に同じ色が割り当てられる）
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // 32bit整数に変換
      }
      return Math.abs(hash);
    };
    
    // インデックスまたはハッシュ値に基づいて色を選択
    if (index !== undefined && index >= 0) {
      return colorPalette[index % colorPalette.length];
    } else {
      const hash = hashCode(groupId);
      return colorPalette[hash % colorPalette.length];
    }
  };

  // データをグループ化する関数
  const getGroupedData = () => {
    if (!reportData || !reportData.entries || reportData.entries.length === 0) {
      return [];
    }

    const groupedData: { id: string; name: string; totalTime: string; totalSeconds: number; percentage: number; color: string }[] = [];
    const totalSeconds = reportData.entries.reduce((acc, entry) => {
      const durationParts = entry.duration.split(':').map(Number);
      const seconds = (durationParts[0] * 3600) + (durationParts[1] * 60) + (durationParts[2] || 0);
      return acc + seconds;
    }, 0);

    // グループごとの集計
    const groupMap: { [key: string]: { id: string; name: string; seconds: number } } = {};

    reportData.entries.forEach(entry => {
      let groupId = '';
      let groupName = '';

      // グループ化の単位に応じてIDと名前を設定
      switch (groupBy) {
        case 'project':
          groupId = entry.projectId || 'no-project';
          groupName = entry.projectName || '未設定';
          break;
        case 'team':
          // チームIDはエントリに直接含まれていないため、プロジェクトのチームIDを使用
          // 実際の実装では、APIからチーム情報を取得する必要があるかもしれません
          groupId = 'team-' + (entry.projectId || 'unknown');
          groupName = 'チーム: ' + (entry.projectName ? entry.projectName.split(' ')[0] : '未設定');
          break;
        case 'user':
          groupId = entry.userId || 'no-user';
          groupName = entry.userName || '未設定';
          break;
        case 'month':
          if (entry.startTime) {
            const date = new Date(entry.startTime);
            groupId = format(date, 'yyyy-MM');
            groupName = format(date, 'yyyy年MM月');
          } else {
            groupId = 'no-date';
            groupName = '日付なし';
          }
          break;
        case 'week':
          if (entry.startTime) {
            const date = new Date(entry.startTime);
            const startOfWeekDate = startOfWeek(date);
            groupId = format(startOfWeekDate, 'yyyy-MM-dd');
            groupName = `${format(startOfWeekDate, 'yyyy/MM/dd')}週`;
          } else {
            groupId = 'no-date';
            groupName = '日付なし';
          }
          break;
        case 'day':
          if (entry.startTime) {
            const date = new Date(entry.startTime);
            groupId = format(date, 'yyyy-MM-dd');
            groupName = format(date, 'yyyy/MM/dd');
          } else {
            groupId = 'no-date';
            groupName = '日付なし';
          }
          break;
        default:
          groupId = entry.projectId || 'no-project';
          groupName = entry.projectName || '未設定';
      }

      // 秒数を計算
      const durationParts = entry.duration.split(':').map(Number);
      const seconds = (durationParts[0] * 3600) + (durationParts[1] * 60) + (durationParts[2] || 0);

      // グループに追加
      if (!groupMap[groupId]) {
        groupMap[groupId] = { id: groupId, name: groupName, seconds: 0 };
      }
      groupMap[groupId].seconds += seconds;
    });

    // 集計結果を配列に変換
    const groupValues = Object.values(groupMap);
    groupValues.forEach((group, index) => {
      const hours = Math.floor(group.seconds / 3600);
      const minutes = Math.floor((group.seconds % 3600) / 60);
      const remainingSeconds = group.seconds % 60;
      
      const totalTime = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        remainingSeconds.toString().padStart(2, '0')
      ].join(':');

      const percentage = totalSeconds > 0 ? (group.seconds / totalSeconds) * 100 : 0;
      const color = getColorForGroup(group.id, index);

      groupedData.push({
        id: group.id,
        name: group.name,
        totalTime,
        totalSeconds: group.seconds,
        percentage,
        color
      });
    });

    // 時間の降順でソート
    return groupedData.sort((a, b) => b.totalSeconds - a.totalSeconds);
  };

  // 時間文字列（HH:MM:SS）を時:分:秒形式に変換する関数
  const formatTimeHHMM = (timeString: string) => {
    if (!timeString) return "00:00";
    
    // 時間、分、秒を取得
    let hours = "00";
    let minutes = "00";
    let seconds = "00";
    
    // HH:MM:SS形式の場合
    if (timeString.split(':').length === 3) {
      [hours, minutes, seconds] = timeString.split(':');
    } 
    // HH:MM形式の場合
    else if (timeString.split(':').length === 2) {
      [hours, minutes] = timeString.split(':');
    }
    
    const hoursNum = parseInt(hours);
    const minutesNum = parseInt(minutes);
    const secondsNum = parseInt(seconds);
    
    // 時間、分、秒をすべて数値に変換
    const totalSeconds = hoursNum * 3600 + minutesNum * 60 + secondsNum;
    
    // 表示形式の決定
    if (totalSeconds === 0) {
      return "0";
    } else if (hoursNum > 0) {
      // 時間がある場合は「時間:分」形式
      return `${hoursNum}:${minutes}`;
    } else if (minutesNum > 0) {
      // 分だけの場合は「分」形式
      return `${minutesNum}分`;
    } else if (secondsNum > 0) {
      // 秒だけの場合は「秒」形式
      return `${secondsNum}秒`;
    }
    
    return "0";
  };

  const handleExportOperationReport = async () => {
    const fileName = `稼働レポート ${format(dateRange.from, 'yyyy/MM/dd')} - ${format(dateRange.to, 'yyyy/MM/dd')}`;
    await fetch('/api/export/operation_report/', {
      method: 'POST',
      body: JSON.stringify({
        reportData: reportData,
      }),
    }).then((response) => {
      response.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = `${fileName}.pdf`;
        a.href = url;
        a.click();
        a.remove();
      });
    }).catch((error) => {
      console.error(error);
    });
  };

  const handleExportOperationReportForTimeline = async () => {
    const fileName = `稼働レポート（タイムライン） ${format(dateRange.from, 'yyyy/MM/dd')} - ${format(dateRange.to, 'yyyy/MM/dd')}`;
    await fetch('/api/export/operation_report_timeline/', {
      method: 'POST',
      body: JSON.stringify({
        reportData: reportData,
      }),
    }).then((response) => {
      response.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = `${fileName}.pdf`;
        a.href = url;
        a.click();
        a.remove();
      });
    }).catch((error) => {
      console.error(error);
    });
  };

  const handleExportOperationReportWithAmount = async () => {
    const fileName = `稼働レポート（金額あり） ${format(dateRange.from, 'yyyy/MM/dd')} - ${format(dateRange.to, 'yyyy/MM/dd')}`;
    await fetch('/api/export/operation_report_with_amount/', {
      method: 'POST',
      body: JSON.stringify({
        reportData: reportData,
      }),
    }).then((response) => {
      response.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = `${fileName}.pdf`;
        a.href = url;
        a.click();
        a.remove();
      });
    }).catch((error) => {
      console.error(error);
    });
  };

  const handleExportInvoice = async () => {
    console.log('請求書のエクスポート');
    const fileName = `請求書 ${format(dateRange.from, 'yyyy/MM/dd')} - ${format(dateRange.to, 'yyyy/MM/dd')}`;
    await fetch('/api/export/invoice/', {
      method: 'POST',
      body: JSON.stringify({
        method: 'invoice',
        reportData: reportData,
      }),
    }).then((response) => {
      response.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = `${fileName}.pdf`;
        a.href = url;
        a.click();
        a.remove();
      });
    }).catch((error) => {
      console.error(error);
    });
  };
  
  return (
    <div className="relative">
      {/* ツールチップ - 棒グラフの上に直接表示 */}
      {tooltip.visible && (
        <div 
          className="fixed bg-gray-800 text-white p-2 rounded shadow-lg z-50 text-xs"
          style={{ 
            left: `${tooltip.x}px`, 
            top: `${tooltip.y - 40}px`, // 棒グラフの上に十分なスペースを確保
            transform: 'translateX(-50%)',
            borderBottom: '2px solid #3b82f6' // 青いボーダーを追加して棒グラフとの関連を視覚的に示す
          }}
        >
          <div className="font-medium">{tooltip.content.date}</div>
          <div>{tooltip.content.time}</div>
          <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-800"></div>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b">
          <div className="flex items-center">
            <div className="px-4 py-2 font-medium">レポート</div>
            <TabsList className="bg-transparent">
              <TabsTrigger 
                value="report" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
              >
                サマリー
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
              >
                詳細
              </TabsTrigger>
              <TabsTrigger 
                value="weekly" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
              >
                週次
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* 共通フィルターコンポーネント */}
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* 日付範囲選択 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {dateRange?.from ? format(dateRange.from, 'yyyy/MM/dd') : '開始日'} - 
                    {dateRange?.to ? format(dateRange.to, 'yyyy/MM/dd') : '終了日'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 border-b">
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => selectDatePreset('today')}>今日</Button>
                    <Button size="sm" variant="outline" onClick={() => selectDatePreset('yesterday')}>昨日</Button>
                    <Button size="sm" variant="outline" onClick={() => selectDatePreset('thisWeek')}>今週</Button>
                    <Button size="sm" variant="outline" onClick={() => selectDatePreset('lastWeek')}>先週</Button>
                    <Button size="sm" variant="outline" onClick={() => selectDatePreset('thisMonth')}>今月</Button>
                    <Button size="sm" variant="outline" onClick={() => selectDatePreset('lastMonth')}>先月</Button>
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-sm text-gray-500 mb-2">
                    {dateSelectionState === 'none' 
                      ? '開始日を選択してください' 
                      : '終了日を選択してください'}
                  </div>
                  <CalendarComponent
                    mode="single"
                    selected={tempStartDate || undefined}
                    onSelect={(date) => handleDateSelect(date || undefined)}
                    modifiers={{
                      range: {
                        from: dateSelectionState === 'start-selected' ? (tempStartDate || dateRange.from) : dateRange.from,
                        to: dateRange.to
                      }
                    }}
                    modifiersStyles={{
                      range: {
                        backgroundColor: 'rgba(59, 130, 246, 0.1)'
                      }
                    }}
                    locale={ja}
                    numberOfMonths={2}
                  />
                </div>
              </PopoverContent>
            </Popover>
            
            {/* フィルターオプション */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* チーム選択（複数選択可能） */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {selectedTeamIds.length > 0 
                      ? `チーム (${selectedTeamIds.length})`
                      : "チーム"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <h4 className="font-medium">チーム選択</h4>
                    <div className="grid gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTeamIds([]);
                          setFilterOptions(prev => ({ ...prev, teamIds: undefined }));
                          setShouldFetchData(true);
                        }}
                        className="justify-start"
                      >
                        すべてクリア
                      </Button>
                      {teams.map(team => (
                        <Button 
                          key={team.id} 
                          variant={selectedTeamIds.includes(team.id) ? "default" : "outline"} 
                          size="sm"
                          onClick={() => handleTeamSelect(team.id)}
                          className="justify-start"
                        >
                          {team.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* プロジェクト選択（複数選択可能） */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {selectedProjectIds.length > 0 
                      ? `プロジェクト (${selectedProjectIds.length})`
                      : "プロジェクト"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <h4 className="font-medium">プロジェクト選択</h4>
                    <div className="grid gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedProjectIds([]);
                          setFilterOptions(prev => ({ ...prev, projectIds: undefined }));
                          setShouldFetchData(true);
                        }}
                        className="justify-start"
                      >
                        すべてクリア
                      </Button>
                      {projects.map(project => (
                        <Button 
                          key={project.id} 
                          variant={selectedProjectIds.includes(project.id) ? "default" : "outline"} 
                          size="sm"
                          onClick={() => handleProjectSelect(project.id)}
                          className="justify-start"
                        >
                          {project.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* タスク選択（複数選択可能） */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {selectedTaskIds.length > 0 
                      ? `タスク (${selectedTaskIds.length})`
                      : "タスク"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <h4 className="font-medium">タスク選択</h4>
                    <div className="grid gap-1 max-h-60 overflow-y-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTaskIds([]);
                          setFilterOptions(prev => ({ ...prev, taskIds: undefined }));
                          setShouldFetchData(true);
                        }}
                        className="justify-start"
                      >
                        すべてクリア
                      </Button>
                      {tasks.map(task => (
                        <Button 
                          key={task.id} 
                          variant={selectedTaskIds.includes(task.id) ? "default" : "outline"} 
                          size="sm"
                          onClick={() => handleTaskSelect(task.id)}
                          className="justify-start"
                        >
                          {task.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* メンバー選択（複数選択可能） */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {selectedUserIds.length > 0 
                      ? `メンバー (${selectedUserIds.length})`
                      : "メンバー"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <h4 className="font-medium">メンバー選択</h4>
                    <div className="grid gap-1 max-h-60 overflow-y-auto">
                      {teamMembers.length === 0 ? (
                        <div className="text-sm text-gray-500 p-2">
                          メンバーが見つかりません
                        </div>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUserIds([]);
                              setFilterOptions(prev => ({ ...prev, userIds: undefined }));
                              setShouldFetchData(true);
                            }}
                            className="justify-start"
                          >
                            すべてクリア
                          </Button>
                          {teamMembers.map(member => (
                            <Button 
                              key={member.userId} 
                              variant={selectedUserIds.includes(member.userId) ? "default" : "outline"} 
                              size="sm"
                              onClick={() => handleMemberSelect(member.userId)}
                              className="justify-start"
                            >
                              {member.userName || member.email || member.userId}
                            </Button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <TabsContent value="report" className="p-4 mt-0">
          <div className="mb-4 flex items-center justify-between rounded-md border bg-gray-50 p-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">合計: {reportData?.totalTime ? formatTimeHHMM(reportData.totalTime) : "00:00"}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* <Button
                variant="ghost" size="sm">
                エクスポート
              </Button> */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" title="エクスポート">
                    エクスポート
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto" align="end">
                  <div className="space-y-2">
                    <h4 className="font-medium">帳票出力</h4>
                    <div className="grid gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          // 稼働レポートのエクスポート
                          handleExportOperationReport();
                        }}
                      >
                        稼働レポート
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          // 稼働レポートのエクスポート
                          handleExportOperationReportForTimeline();
                        }}
                      >
                        稼働レポート（タイムライン）
                      </Button>
                      {/* <Button 
                        variant="outline" 
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          // 稼働レポート（金額あり）のエクスポート
                          handleExportOperationReportWithAmount();
                        }}
                      >
                        稼働レポート（金額あり）
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          // 請求書のエクスポート
                          handleExportInvoice();
                        }}
                      >
                        請求書
                      </Button> */}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  window.print();
                }}
                title="印刷"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" title="共有">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto" align="end">
                  <div className="space-y-2">
                    <h4 className="font-medium">レポートを共有</h4>
                    <div className="grid gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          // URLをクリップボードにコピー
                          navigator.clipboard.writeText(window.location.href)
                            .then(() => {
                              alert('URLがクリップボードにコピーされました');
                            })
                            .catch(err => {
                              console.error('URLのコピーに失敗しました:', err);
                            });
                        }}
                      >
                        リンクをコピー（実装予定）
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          const subject = encodeURIComponent(`レポート共有: ${format(dateRange.from, 'yyyy/MM/dd')} - ${format(dateRange.to, 'yyyy/MM/dd')}`);
                          const body = encodeURIComponent(`レポートの共有リンク: ${window.location.href}`);
                          window.location.href = `mailto:?subject=${subject}&body=${body}`;
                        }}
                      >
                        メールで共有（実装予定）
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mb-6 h-64 w-full bg-gray-100">
            {reportData?.entries && reportData.entries.length > 0 ? (
              <div className="flex h-full items-end justify-between gap-0 p-4 w-full">
                {(() => {
                  const fromDate = new Date(dateRange.from);
                  const toDate = new Date(dateRange.to);
                  
                  // 日付範囲が1年間かどうかを判断
                  const diffInDays = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
                  const isYearRange = diffInDays >= 365;
                  
                  // グループ化されたデータを取得
                  const groupedData = getGroupedData();
                  
                  // 時間エントリから日付または月ごとの合計秒数を計算（グループごとに分ける）
                  const timeByPeriod: { 
                    [periodKey: string]: { 
                      totalSeconds: number; 
                      groupData: { 
                        [groupId: string]: { 
                          seconds: number; 
                          color: string; 
                          name: string;
                        } 
                      } 
                    } 
                  } = {};
                  
                  reportData.entries.forEach(entry => {
                    if (entry.startTime) {
                      const entryDate = new Date(entry.startTime);
                      // 1年間の場合は月ごと、それ以外は日付ごとにグループ化
                      const periodKey = isYearRange 
                        ? format(entryDate, 'yyyy-MM') 
                        : format(entryDate, 'yyyy-MM-dd');
                      
                      // 時間文字列（HH:MM:SS）を秒数に変換
                      const durationParts = entry.duration.split(':').map(Number);
                      const seconds = (durationParts[0] * 3600) + (durationParts[1] * 60) + (durationParts[2] || 0);
                      
                      // グループIDとグループ名を取得
                      let groupId = '';
                      let groupName = '';
                      
                      // グループ化の単位に応じてIDと名前を設定
                      switch (groupBy) {
                        case 'project':
                          groupId = entry.projectId || 'no-project';
                          groupName = entry.projectName || '未設定';
                          break;
                        case 'team':
                          groupId = 'team-' + (entry.projectId || 'unknown');
                          groupName = 'チーム: ' + (entry.projectName ? entry.projectName.split(' ')[0] : '未設定');
                          break;
                        case 'user':
                          groupId = entry.userId || 'no-user';
                          groupName = entry.userName || '未設定';
                          break;
                        case 'month':
                          if (entry.startTime) {
                            const date = new Date(entry.startTime);
                            groupId = format(date, 'yyyy-MM');
                            groupName = format(date, 'yyyy年MM月');
                          } else {
                            groupId = 'no-date';
                            groupName = '日付なし';
                          }
                          break;
                        case 'week':
                          if (entry.startTime) {
                            const date = new Date(entry.startTime);
                            const startOfWeekDate = startOfWeek(date);
                            groupId = format(startOfWeekDate, 'yyyy-MM-dd');
                            groupName = `${format(startOfWeekDate, 'yyyy/MM/dd')}週`;
                          } else {
                            groupId = 'no-date';
                            groupName = '日付なし';
                          }
                          break;
                        case 'day':
                          if (entry.startTime) {
                            const date = new Date(entry.startTime);
                            groupId = format(date, 'yyyy-MM-dd');
                            groupName = format(date, 'yyyy/MM/dd');
                          } else {
                            groupId = 'no-date';
                            groupName = '日付なし';
                          }
                          break;
                        default:
                          groupId = entry.projectId || 'no-project';
                          groupName = entry.projectName || '未設定';
                      }
                      
                      // 対応するグループの色を取得
                      const matchingGroup = groupedData.find(g => g.id === groupId);
                      const color = matchingGroup?.color || getColorForGroup(groupId, 0);
                      
                      // 期間のデータを初期化
                      if (!timeByPeriod[periodKey]) {
                        timeByPeriod[periodKey] = { 
                          totalSeconds: 0,
                          groupData: {}
                        };
                      }
                      
                      // グループのデータを初期化
                      if (!timeByPeriod[periodKey].groupData[groupId]) {
                        timeByPeriod[periodKey].groupData[groupId] = {
                          seconds: 0,
                          color: color,
                          name: groupName
                        };
                      }
                      
                      // 秒数を加算
                      timeByPeriod[periodKey].totalSeconds += seconds;
                      timeByPeriod[periodKey].groupData[groupId].seconds += seconds;
                    }
                  });
                  
                  // 期間内の全ての日付または月を生成
                  const periodArray = [];
                  const currentDate = new Date(fromDate);
                  
                  if (isYearRange) {
                    // 月ごとに生成
                    while (currentDate <= toDate) {
                      const periodKey = format(currentDate, 'yyyy-MM');
                      const periodData = timeByPeriod[periodKey] || { totalSeconds: 0, groupData: {} };
                      
                      // 秒数を時間文字列（HH:MM:SS）に変換
                      const hours = Math.floor(periodData.totalSeconds / 3600);
                      const minutes = Math.floor((periodData.totalSeconds % 3600) / 60);
                      const remainingSeconds = periodData.totalSeconds % 60;
                      
                      const totalTime = [
                        hours.toString().padStart(2, '0'),
                        minutes.toString().padStart(2, '0')
                      ].join(':');
                      
                      // グループごとのデータを配列に変換
                      const groupsArray = Object.entries(periodData.groupData).map(([id, data]) => ({
                        id,
                        seconds: data.seconds,
                        color: data.color,
                        name: data.name
                      })).sort((a, b) => b.seconds - a.seconds); // 時間の降順でソート
                      
                      periodArray.push({
                        date: new Date(currentDate),
                        periodKey,
                        totalTime,
                        totalSeconds: periodData.totalSeconds,
                        groups: groupsArray
                      });
                      
                      // 次の月に進む
                      currentDate.setMonth(currentDate.getMonth() + 1);
                    }
                  } else {
                    // 日付ごとに生成
                    while (currentDate <= toDate) {
                      const periodKey = format(currentDate, 'yyyy-MM-dd');
                      const periodData = timeByPeriod[periodKey] || { totalSeconds: 0, groupData: {} };
                      
                      // 秒数を時間文字列（HH:MM:SS）に変換
                      const hours = Math.floor(periodData.totalSeconds / 3600);
                      const minutes = Math.floor((periodData.totalSeconds % 3600) / 60);
                      const remainingSeconds = periodData.totalSeconds % 60;
                      
                      const totalTime = [
                        hours.toString().padStart(2, '0'),
                        minutes.toString().padStart(2, '0')
                      ].join(':');
                      
                      // グループごとのデータを配列に変換
                      const groupsArray = Object.entries(periodData.groupData).map(([id, data]) => ({
                        id,
                        seconds: data.seconds,
                        color: data.color,
                        name: data.name
                      })).sort((a, b) => b.seconds - a.seconds); // 時間の降順でソート
                      
                      periodArray.push({
                        date: new Date(currentDate),
                        periodKey,
                        totalTime,
                        totalSeconds: periodData.totalSeconds,
                        groups: groupsArray
                      });
                      
                      // 次の日に進む
                      currentDate.setDate(currentDate.getDate() + 1);
                    }
                  }
                  
                  // 最大秒数を計算して正規化する
                  const allSeconds = Object.values(timeByPeriod).map(data => data.totalSeconds);
                  const maxSeconds = Math.max(...allSeconds, 1); // 0除算を避けるため最小値を1に
                  
                  // 期間の配列を返す
                  return periodArray.map((period, index) => {
                    // 時間に応じた高さを計算
                    // 1分未満（60秒未満）の場合は棒を表示しない
                    // それ以外の場合は、最小の高さを10pxに設定し、最大の高さは180pxに制限
                    const percentage = period.totalSeconds >= 60 ? (period.totalSeconds / maxSeconds) * 100 : 0;
                    const heightInPixels = period.totalSeconds >= 60 
                      ? Math.max(10, Math.min(180 * (percentage / 100), 180))
                      : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center" style={{ 
                        // データ数に応じて幅を調整（多いほど細く）
                        width: `${Math.max(8, Math.min(30, 100 / periodArray.length))}%`,
                        minWidth: '4px',
                        maxWidth: '30px'
                      }}>
                        {/* 棒グラフ部分 - 積み重ね表示 */}
                        <div 
                          className="rounded-t cursor-pointer relative"
                          style={{
                            width: '100%',
                            maxWidth: '20px',
                            height: `${heightInPixels}px`, // 絶対値でピクセル指定
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            // マウス位置を取得
                            const rect = e.currentTarget.getBoundingClientRect();
                            // 棒の中央上部に表示
                            const barCenterX = rect.left + (rect.width / 2);
                            const barTopY = rect.top;
                            
                            // ツールチップの内容を作成
                            const tooltipContent = {
                              date: isYearRange 
                                ? format(period.date, 'yyyy年MM月') 
                                : format(period.date, 'yyyy年MM月dd日'),
                              time: formatTimeHHMM(period.totalTime)
                            };
                            
                            setTooltip({
                              visible: true,
                              x: barCenterX,
                              y: barTopY - 2, // 棒のすぐ上に表示
                              content: tooltipContent
                            });
                          }}
                          onMouseLeave={() => {
                            setTooltip({ ...tooltip, visible: false });
                          }}
                        >
                          {/* 積み重ね棒グラフの各セグメント */}
                          {period.groups && period.groups.map((group, groupIndex) => {
                            // 各グループの高さを計算（全体に対する割合）
                            const groupPercentage = period.totalSeconds > 0 
                              ? (group.seconds / period.totalSeconds) * 100 
                              : 0;
                            
                            // 前のグループの合計の高さを計算（位置決め用）
                            const previousGroupsHeight = period.groups
                              .slice(0, groupIndex)
                              .reduce((sum, g) => sum + (g.seconds / period.totalSeconds) * heightInPixels, 0);
                            
                            return (
                              <div
                                key={groupIndex}
                                style={{
                                  position: 'absolute',
                                  bottom: `${(previousGroupsHeight / heightInPixels) * 100}%`,
                                  width: '100%',
                                  height: `${groupPercentage}%`,
                                  backgroundColor: group.color || '#3b82f6',
                                  borderTopLeftRadius: groupIndex === period.groups.length - 1 ? '0.25rem' : 0,
                                  borderTopRightRadius: groupIndex === period.groups.length - 1 ? '0.25rem' : 0
                                }}
                              />
                            );
                          })}
                        </div>
                        
                        {/* ラベル部分（常に同じ高さを確保） */}
                        <div className="h-10 flex items-start justify-center w-full">
                          {(() => {
                            // データ数に応じてラベル表示の間隔を決定
                            const labelInterval = (() => {
                              if (periodArray.length > 100) return 20;
                              if (periodArray.length > 60) return 10;
                              if (periodArray.length > 30) return 5;
                              if (periodArray.length > 15) return 3;
                              return 1;
                            })();
                            
                            // インデックスが表示間隔の倍数の場合のみラベルを表示
                            if (index % labelInterval === 0) {
                              return (
                                <div className="text-xs text-center" style={{
                                  fontSize: periodArray.length > 20 ? '0.6rem' : '0.7rem',
                                  width: '100%',
                                  whiteSpace: 'normal',
                                  lineHeight: '1.1'
                                }}>
                                  {isYearRange 
                                    ? format(period.date, 'MM') 
                                    : format(period.date, 'MM/dd')}
                                  <br />
                                  {formatTimeHHMM(period.totalTime)}
                                </div>
                              );
                            }
                            return <div className="invisible">-</div>; // 非表示の場合も同じ高さを確保
                          })()}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">期間内のデータがありません</p>
              </div>
            )}
          </div>

          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <div>グループ化:</div>
            <Button 
              variant={groupBy === 'project' ? "default" : "outline"} 
              size="sm"
              onClick={() => setGroupBy('project')}
            >
              プロジェクト
            </Button>
            <Button 
              variant={groupBy === 'team' ? "default" : "outline"} 
              size="sm"
              onClick={() => setGroupBy('team')}
            >
              チーム
            </Button>
            <Button 
              variant={groupBy === 'user' ? "default" : "outline"} 
              size="sm"
              onClick={() => setGroupBy('user')}
            >
              実施者
            </Button>
            <Button 
              variant={groupBy === 'month' ? "default" : "outline"} 
              size="sm"
              onClick={() => setGroupBy('month')}
            >
              月
            </Button>
            <Button 
              variant={groupBy === 'week' ? "default" : "outline"} 
              size="sm"
              onClick={() => setGroupBy('week')}
            >
              週
            </Button>
            <Button 
              variant={groupBy === 'day' ? "default" : "outline"} 
              size="sm"
              onClick={() => setGroupBy('day')}
            >
              日
            </Button>
          </div>

          <div className="rounded-md border">
            <div className="grid grid-cols-[1fr_200px] border-b bg-gray-50 p-3 text-sm">
              <div className="font-medium">タイトル</div>
              <div className="font-medium text-right">時間</div>
            </div>
            {getGroupedData().map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_200px] border-b p-3">
                <div className="flex items-center gap-2">
                  <span 
                    className="h-2 w-2 rounded-full" 
                    style={{ backgroundColor: item.color || '#3b82f6' }}
                  ></span>
                  <span>{item.name}</span>
                </div>
                <div className="text-right">{formatTimeHHMM(item.totalTime)}</div>
              </div>
            ))}
          </div>
        </TabsContent>
        
        
        <TabsContent value="details" className="p-4 mt-0">
          <div className="mb-4">
            <h3 className="text-xl font-medium">詳細レポート</h3>
            <p className="text-gray-500">期間: {dateRange?.from ? format(dateRange.from, 'yyyy/MM/dd') : '開始日'} - {dateRange?.to ? format(dateRange.to, 'yyyy/MM/dd') : '終了日'}</p>
          </div>
          
          <div className="rounded-md border">
            <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] border-b bg-gray-50 p-3 text-sm">
              <div className="font-medium">実施者</div>
              <div className="font-medium">タスク</div>
              <div className="font-medium">プロジェクト</div>
              <div className="font-medium">日付</div>
              <div className="font-medium text-right">時間</div>
            </div>
            {reportData?.entries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] border-b p-3">
                <div>{entry.userName || "未設定"}</div>
                <div>{entry.taskTitle || entry.description || "未設定"}</div>
                <div>{entry.projectName || "未設定"}</div>
                <div>{entry.startTime ? format(new Date(entry.startTime), 'yyyy/MM/dd') : ""}</div>
                <div className="text-right">{formatTimeHHMM(entry.duration)}</div>
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="weekly" className="p-4 mt-0">
          <div className="mb-4">
            <h3 className="text-xl font-medium">週次レポート</h3>
            <p className="text-gray-500">期間: {dateRange?.from ? format(dateRange.from, 'yyyy/MM/dd') : '開始日'} - {dateRange?.to ? format(dateRange.to, 'yyyy/MM/dd') : '終了日'}</p>
          </div>
          
          <div className="grid grid-cols-7 gap-2 mb-6">
            {Array.from({ length: 7 }).map((_, index) => {
              const day = dateRange?.from ? addDays(dateRange.from, index) : addDays(new Date(), index);
              const formattedDate = format(day, 'yyyy-MM-dd');
              const dailyData = reportData?.dailyBreakdown?.find(d => d.date === formattedDate);
              
              return (
                <div key={index} className="border rounded-md p-3 text-center">
                  <div className="text-sm text-gray-500">{format(day, 'E', { locale: ja })}</div>
                  <div className="text-sm">{format(day, 'MM/dd')}</div>
                  <div className="mt-2 font-medium">{dailyData?.totalTime ? formatTimeHHMM(dailyData.totalTime) : "00:00"}</div>
                </div>
              );
            })}
          </div>
          
            <div className="rounded-md border">
              <div className="grid grid-cols-[1fr_200px] border-b bg-gray-50 p-3 text-sm">
                <div className="font-medium">プロジェクト</div>
                <div className="font-medium text-right">合計時間</div>
              </div>
              {reportData?.projectBreakdown.map((project) => (
                <div key={project.id} className="grid grid-cols-[1fr_200px] border-b p-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ 
                        backgroundColor: getColorForGroup(project.id, reportData.projectBreakdown.indexOf(project)) 
                      }}
                    ></span>
                    <span>{project.name}</span>
                  </div>
                  <div className="text-right">{formatTimeHHMM(project.totalTime)}</div>
                </div>
              ))}
            </div>
        </TabsContent>
        
        {/* 共有タブは削除されました */}
      </Tabs>
    </div>
  );
}
