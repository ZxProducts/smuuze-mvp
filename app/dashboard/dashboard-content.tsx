"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, getYear, startOfYear, endOfYear, subMonths, isAfter } from "date-fns"
import { ja } from "date-fns/locale"
import { get } from "@/lib/api-client"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

// プロジェクトIDとインデックスに基づいて色を生成する関数
const getProjectColor = (projectId: string, index: number | undefined): string => {
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
    const hash = hashCode(projectId);
    return colorPalette[hash % colorPalette.length];
  }
};

// ユーザーIDとインデックスに基づいて色を生成する関数
const getUserColor = (userId: string, index: number): string => {
  // ユーザー用の色のパレット（プロジェクトとは異なる色を使用）
  const colorPalette = [
    '#06b6d4', // cyan-500
    '#8b5cf6', // violet-500
    '#f97316', // orange-500
    '#10b981', // emerald-500
    '#ec4899', // pink-500
    '#f59e0b', // amber-500
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#14b8a6', // teal-500
    '#6366f1'  // indigo-500
  ];
  
  // ユーザーIDをハッシュ化して色を選択
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };
  
  // インデックスまたはハッシュ値に基づいて色を選択
  if (index !== undefined && index >= 0) {
    return colorPalette[index % colorPalette.length];
  } else {
    const hash = hashCode(userId);
    return colorPalette[hash % colorPalette.length];
  }
};

// プロジェクトの内訳データを使用して円グラフを描画する関数
const renderPieChart = (projectBreakdown: {
  id: string;
  name: string;
  totalTime: string;
  totalSeconds: number;
  percentage: number;
}[]) => {
  // 円グラフのセグメントを描画
  let cumulativePercentage = 0;
  
  return projectBreakdown.map((project, index) => {
    // 円グラフのセグメントの開始角度と終了角度を計算
    const startAngle = cumulativePercentage * 3.6; // 100%を360度に変換
    cumulativePercentage += project.percentage;
    const endAngle = cumulativePercentage * 3.6;
    
    // 円弧のパスを計算
    const startX = 50 + 40 * Math.cos((startAngle - 90) * (Math.PI / 180));
    const startY = 50 + 40 * Math.sin((startAngle - 90) * (Math.PI / 180));
    const endX = 50 + 40 * Math.cos((endAngle - 90) * (Math.PI / 180));
    const endY = 50 + 40 * Math.sin((endAngle - 90) * (Math.PI / 180));
    
    // 円弧の大きさを決定（180度以上なら大きい円弧、そうでなければ小さい円弧）
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    // プロジェクトの色を取得
    const color = getProjectColor(project.id, index);
    
    // SVGのパスを生成
    const path = `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    
    return (
      <g key={project.id}>
        <path
          d={path}
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
        <title>{`${project.name}: ${project.percentage.toFixed(1)}%`}</title>
      </g>
    );
  });
};

// APIレスポンスの型定義
type DashboardDataResponse = {
  totalTime: string
  topProject: {
    id: string
    name: string
  } | null
  topClient: string | null
  monthlyData: {
    month: number
    totalHours: number
  }[]
  projectBreakdown: {
    id: string
    name: string
    totalTime: string
    totalSeconds: number
    percentage: number
  }[]
  userBreakdown?: {
    id: string
    name: string
    totalTime: string
    totalSeconds: number
    percentage: number
  }[]
}

type ProjectsResponse = {
  projects: {
    id: string
    name: string
  }[]
}

type TeamsResponse = {
  teams: {
    id: string
    name: string
  }[]
}

export function DashboardContent() {
  const currentDate = new Date()
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: startOfYear(currentDate),
    to: endOfYear(currentDate)
  })
  
  // 日付選択の状態を管理（none: 未選択、start-selected: 開始日選択済み）
  const [dateSelectionState, setDateSelectionState] = useState<'none' | 'start-selected'>('none')
  // 一時的な開始日を保存
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null)
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardDataResponse | null>(null)
  const [projects, setProjects] = useState<{id: string, name: string}[]>([])
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // プロジェクト一覧を取得
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await get<ProjectsResponse>("/api/projects")
        if (response.projects) {
          setProjects(response.projects)
        }
      } catch (error: any) {
        console.error("プロジェクトの取得に失敗しました", error)
        setError("プロジェクトの取得に失敗しました")
      }
    }
    
    fetchProjects()
  }, [])

  // チーム一覧を取得
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await get<TeamsResponse>("/api/teams")
        if (response.teams) {
          setTeams(response.teams)
        }
      } catch (error: any) {
        console.error("チームの取得に失敗しました", error)
        setError("チームの取得に失敗しました")
      }
    }
    
    fetchTeams()
  }, [])

  // ダッシュボードデータを取得
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)
      try {
        // クエリパラメータを構築
        const params = new URLSearchParams()
        params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'))
        params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'))
        if (selectedProjectId) params.append('projectId', selectedProjectId)
        if (selectedTeamId) params.append('teamId', selectedTeamId)
        
        const response = await get<DashboardDataResponse>(`/api/dashboard?${params.toString()}`)
        console.log("ダッシュボードデータ:", response)
        console.log("月別データ:", response.monthlyData)
        setDashboardData(response)
      } catch (error: any) {
        console.error("ダッシュボードデータの取得に失敗しました", error)
        setError("ダッシュボードデータの取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [dateRange, selectedProjectId, selectedTeamId])

  // 日付を選択する処理
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // 未来の日付は選択できないように制限
    const now = new Date();
    if (isAfter(date, now)) {
      date = now;
    }
    
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
      
      // 日付範囲を更新し、データを取得する
      setDateRange({ from, to });
      setDateSelectionState('none');
      setTempStartDate(null);
      
      // ポップオーバーを閉じる
      setTimeout(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }, 100);
    }
  };

  // 期間を今年に設定
  const setCurrentYear = () => {
    setDateRange({
      from: startOfYear(new Date()),
      to: endOfYear(new Date())
    })
    setDateSelectionState('none');
    setTempStartDate(null);
  }

  // 期間を前年に設定
  const setPreviousYear = () => {
    const prevYear = new Date()
    prevYear.setFullYear(prevYear.getFullYear() - 1)
    setDateRange({
      from: startOfYear(prevYear),
      to: endOfYear(prevYear)
    })
    setDateSelectionState('none');
    setTempStartDate(null);
  }

  // 期間を過去3ヶ月に設定
  const setLast3Months = () => {
    const now = new Date()
    setDateRange({
      from: subMonths(now, 3),
      to: now
    })
    setDateSelectionState('none');
    setTempStartDate(null);
  }

  // 期間を過去6ヶ月に設定
  const setLast6Months = () => {
    const now = new Date()
    setDateRange({
      from: subMonths(now, 6),
      to: now
    })
    setDateSelectionState('none');
    setTempStartDate(null);
  }

  // プロジェクト選択の切り替え
  const toggleProjectSelection = (projectId: string) => {
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null) // 選択解除
    } else {
      setSelectedProjectId(projectId) // 選択
    }
  }

  // チーム選択の切り替え
  const toggleTeamSelection = (teamId: string) => {
    if (selectedTeamId === teamId) {
      setSelectedTeamId(null) // 選択解除
    } else {
      setSelectedTeamId(teamId) // 選択
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">読み込み中...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>
  }

  // 月別チャートの最大値を計算
  const maxMonthlyHours = dashboardData?.monthlyData 
    ? Math.max(...dashboardData.monthlyData.map(item => item.totalHours), 1) 
    : 1
  
  // デバッグ情報
  console.log("最大月間時間:", maxMonthlyHours);
  console.log("月別データ:", dashboardData?.monthlyData);

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">ダッシュボード</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* プロジェクト選択ドロップダウン */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between min-w-40">
                {selectedProjectId ? (
                  projects.find(p => p.id === selectedProjectId)?.name || "プロジェクト"
                ) : (
                  "プロジェクト選択"
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Command>
                <CommandInput placeholder="プロジェクトを検索..." />
                <CommandList>
                  <CommandEmpty>プロジェクトが見つかりません</CommandEmpty>
                  <CommandGroup>
                    {projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        onSelect={() => toggleProjectSelection(project.id)}
                        className="flex items-center"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedProjectId === project.id ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {project.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          {/* チーム選択ドロップダウン */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between min-w-40">
                {selectedTeamId ? (
                  teams.find(t => t.id === selectedTeamId)?.name || "チーム"
                ) : (
                  "チーム選択"
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Command>
                <CommandInput placeholder="チームを検索..." />
                <CommandList>
                  <CommandEmpty>チームが見つかりません</CommandEmpty>
                  <CommandGroup>
                    {teams.map((team) => (
                      <CommandItem
                        key={team.id}
                        onSelect={() => toggleTeamSelection(team.id)}
                        className="flex items-center"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedTeamId === team.id ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {team.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          {/* 選択中のフィルターを表示 */}
          <div className="flex gap-2 items-center">
            {selectedProjectId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                プロジェクト: {projects.find(p => p.id === selectedProjectId)?.name}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 p-0" 
                  onClick={() => setSelectedProjectId(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {selectedTeamId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                チーム: {teams.find(t => t.id === selectedTeamId)?.name}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 p-0" 
                  onClick={() => setSelectedTeamId(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
          
          {/* 期間選択 */}
          <div className="flex items-center gap-1 ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 min-w-40">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, 'yyyy/MM/dd', { locale: ja })} - {format(dateRange.to, 'yyyy/MM/dd', { locale: ja })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">期間を選択</h4>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={setCurrentYear}
                      >
                        今年
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={setPreviousYear}
                      >
                        前年
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={setLast3Months}
                      >
                        過去3ヶ月
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={setLast6Months}
                      >
                        過去6ヶ月
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-sm text-gray-500 mb-2">
                    {dateSelectionState === 'none' 
                      ? '開始日を選択してください' 
                      : '終了日を選択してください'}
                  </div>
                  <Calendar
                    mode="single"
                    selected={tempStartDate || undefined}
                    onSelect={(date) => handleDateSelect(date || undefined)}
                    locale={ja}
                    disabled={(date) => isAfter(date, new Date())}
                    initialFocus
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

<div className="grid grid-cols-2 gap-4">
  <div className="rounded-lg bg-gray-50 p-4">
    <div className="text-sm text-gray-500">合計時間</div>
    <div className="text-2xl font-bold">{dashboardData?.totalTime || "00:00:00"}</div>
  </div>
  <div className="rounded-lg bg-gray-50 p-4">
    <div className="text-sm text-gray-500">トッププロジェクト</div>
    <div className="text-2xl font-bold">{dashboardData?.topProject?.name || "--"}</div>
  </div>
</div>

      <div className="mt-6 rounded-lg border p-4">
        <div className="mb-2 font-medium">月別集計</div>
        <div className="h-64 w-full bg-gray-100">
          {/* データがない場合のメッセージ */}
          {dashboardData?.monthlyData?.every(item => item.totalHours === 0) ? (
            <div className="h-52 flex items-center justify-center text-gray-500">
              この期間のデータはありません
            </div>
          ) : (
            /* 月別チャート（積み上げバーチャート） */
            <div className="h-52 flex items-end justify-between px-4">
              {/* 1月から12月までのデータを表示（データがない月も表示） */}
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const monthData = dashboardData?.monthlyData?.find(item => item.month === month);
                const totalHours = monthData?.totalHours || 0;
                
                // 時間が0の場合はバーを表示しない
                if (totalHours <= 0) {
                  return (
                    <div key={month} className="flex w-16 flex-col items-center">
                      <div className="w-12 h-0"></div>
                      <div className="mt-2 text-xs">{month}月</div>
                    </div>
                  );
                }
                
                // 最大値に対する割合を計算（最大高さは48pxに制限）
                const barHeight = maxMonthlyHours > 0 
                  ? Math.min(Math.floor((totalHours / maxMonthlyHours) * 48), 48) 
                  : 0;
                
                // プロジェクトの割合に基づいて月の時間を分配
                const projectContributions = dashboardData?.projectBreakdown.map(project => {
                  return {
                    id: project.id,
                    name: project.name,
                    percentage: project.percentage,
                    hours: (project.percentage / 100) * totalHours,
                    // 色を割り当て
                    color: getProjectColor(project.id, dashboardData?.projectBreakdown.indexOf(project))
                  };
                }) || [];
                
                return (
                  <div key={month} className="flex w-16 flex-col items-center">
                    <div 
                      className="w-12 relative transition-all duration-300" 
                      style={{ height: `${barHeight}px` }}
                      title={`${totalHours.toFixed(1)}時間`}
                    >
                      {/* 積み上げバー - プロジェクト別に色分け */}
                      {projectContributions.map((project, index) => {
                        // 前のプロジェクトまでの累積割合を計算
                        const previousPercentage = projectContributions
                          .slice(0, index)
                          .reduce((sum, p) => sum + p.percentage, 0);
                        
                        // このプロジェクトの高さの割合
                        const heightPercentage = project.percentage;
                        
                        // バーの位置と高さを計算
                        const segmentHeight = (heightPercentage / 100) * barHeight;
                        const bottomPosition = (previousPercentage / 100) * barHeight;
                        
                        return (
                          <div
                            key={project.id}
                            className="absolute w-full"
                            style={{
                              backgroundColor: project.color,
                              height: `${segmentHeight}px`,
                              bottom: `${bottomPosition}px`,
                              left: 0,
                            }}
                            title={`${project.name}: ${project.hours.toFixed(1)}時間`}
                          />
                        );
                      })}
                      
                      {/* バーの上に時間を表示（バーが十分な高さの場合のみ） */}
                      {barHeight > 15 && (
                        <div className="absolute top-0 left-0 right-0 text-xs text-white text-center overflow-hidden">
                          {totalHours.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs">{month}月</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <div className="h-64 w-full">
            {/* 円グラフ - プロジェクト別に色分け */}
            <div className="flex h-full items-center justify-center">
              {dashboardData?.projectBreakdown && dashboardData.projectBreakdown.length > 0 ? (
                <div className="relative h-48 w-48">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    {/* 円グラフのセグメント */}
                    {renderPieChart(dashboardData.projectBreakdown)}
                    {/* 中央の円（白い背景） */}
                    <circle cx="50" cy="50" r="30" fill="white" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold">{dashboardData?.totalTime || "00:00:00"}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">データがありません</div>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="mb-2 font-medium">プロジェクト別</div>
          <div className="space-y-2">
            {dashboardData?.projectBreakdown.map((project, index) => {
              // プロジェクトの色を取得
              const projectColor = getProjectColor(project.id, index);
              
              return (
                <div key={project.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: projectColor }}
                    ></div>
                    <div>{project.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>{project.totalTime}</div>
                    <div className="w-32 bg-gray-200">
                      <div 
                        style={{ 
                          width: `${project.percentage}%`,
                          height: '8px',
                          backgroundColor: projectColor
                        }} 
                      ></div>
                    </div>
                    <div>{project.percentage.toFixed(2)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* ユーザー別の時間集計 */}
      {dashboardData?.userBreakdown && dashboardData.userBreakdown.length > 0 && (
        <div className="mt-6 rounded-lg border p-4">
          <div className="mb-2 font-medium">メンバー別</div>
          <div className="space-y-2">
            {dashboardData.userBreakdown.map((user, index) => {
              // ユーザーの色を取得
              const userColor = getUserColor(user.id, index);
              
              return (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: userColor }}
                    ></div>
                    <div>{user.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>{user.totalTime}</div>
                    <div className="w-32 bg-gray-200">
                      <div 
                        style={{ 
                          width: `${user.percentage}%`,
                          height: '8px',
                          backgroundColor: userColor
                        }} 
                      ></div>
                    </div>
                    <div>{user.percentage.toFixed(2)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}
