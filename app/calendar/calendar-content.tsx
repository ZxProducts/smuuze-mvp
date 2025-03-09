"use client"

import * as React from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, subDays, startOfWeek, endOfWeek, getDay, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon, ChevronLeft, ChevronRight, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { get, put } from "@/lib/api-client"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

// APIレスポンスの型定義
type TimeEntriesResponse = {
  timeEntries: TimeEntry[]
}

// タイムエントリーの型定義
interface TimeEntry {
  id: string
  description: string | null
  user_id: string
  project_id: string
  task_id: string
  start_time: string
  end_time: string | null
  break_minutes: number
  projects?: {
    id: string
    name: string
  }
  tasks?: {
    id: string
    title: string
  }
}

// カレンダーイベントの型定義
interface CalendarEvent {
  id: string
  title: string
  projectName: string
  startTime: Date
  endTime: Date | null
  description: string | null
}

// APIレスポンスの型定義（追加）
type ProjectsResponse = {
  projects: Project[]
}

type TasksResponse = {
  tasks: Task[]
}

type TimeEntryResponse = {
  timeEntry: TimeEntry
}

// プロジェクトの型定義
interface Project {
  id: string
  name: string
  team_id: string
}

// タスクの型定義
interface Task {
  id: string
  title: string
  project_id: string
  team_id: string
  task_assignees?: {
    id: string
    user_id: string
    profiles: {
      id: string
      full_name: string
    }
  }[]
}

export function CalendarContent() {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [timeEntries, setTimeEntries] = React.useState<TimeEntry[]>([])
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'day'>('month')
  
  // 編集ダイアログ用の状態
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [currentEntry, setCurrentEntry] = React.useState<TimeEntry | null>(null)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [availableTasks, setAvailableTasks] = React.useState<Task[]>([])
  
  // プロジェクト一覧を取得
  React.useEffect(() => {
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
  
  // タイムエントリーの編集
  const editTimeEntry = async (entryId: string) => {
    try {
      // タイムエントリーを検索
      const entry = timeEntries.find(e => e.id === entryId)
      if (!entry) return
      
      // タスク一覧を取得
      if (entry.project_id) {
        const response = await get<TasksResponse>(`/api/tasks?projectId=${entry.project_id}`)
        if (response.tasks) {
          // 自分に割り当てられたタスクのみをフィルタリング
          const myTasks = response.tasks.filter(task => 
            task.task_assignees && 
            task.task_assignees.some(assignee => assignee.profiles.id === assignee.user_id)
          )
          setAvailableTasks(myTasks)
        }
      }
      
      setCurrentEntry(entry)
      setIsEditDialogOpen(true)
    } catch (error: any) {
      console.error("タスクの取得に失敗しました", error)
      setError("タスクの取得に失敗しました")
    }
  }
  
  // 開始時間と終了時間の関係を検証
  const validateTimeRange = (startTime: string, endTime: string | null): boolean => {
    if (!endTime) return true // 終了時間がない場合は有効
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    return end > start // 終了時間が開始時間より後であれば有効
  }
  
  // タイムエントリーの保存
  const saveTimeEntry = async () => {
    if (!currentEntry) return
    
    // 開始時間と終了時間の関係を検証
    if (currentEntry.end_time && !validateTimeRange(currentEntry.start_time, currentEntry.end_time)) {
      setError("終了時間は開始時間より後である必要があります")
      return
    }
    
    try {
      // タイムエントリーをAPIで更新
      const payload = {
        description: currentEntry.description,
        projectId: currentEntry.project_id,
        taskId: currentEntry.task_id,
        startTime: currentEntry.start_time,
        endTime: currentEntry.end_time,
      }
      
      await put<TimeEntryResponse>(`/api/time-entries/${currentEntry.id}`, payload)
      
      // タイムエントリー一覧を再取得
      await refreshTimeEntries()
      
      setIsEditDialogOpen(false)
      setCurrentEntry(null)
      setError(null) // エラーをクリア
    } catch (error: any) {
      console.error("タイムエントリーの更新に失敗しました", error)
      setError("タイムエントリーの更新に失敗しました")
    }
  }
  
  // 削除確認用の状態
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [entryToDelete, setEntryToDelete] = React.useState<string | null>(null)

  // 削除確認ダイアログを表示
  const confirmDeleteEntry = () => {
    if (!currentEntry) return
    setEntryToDelete(currentEntry.id)
    setIsDeleteDialogOpen(true)
  }

  // タイムエントリーの削除
  const deleteTimeEntry = async () => {
    if (!entryToDelete) return
    
    try {
      // タイムエントリーをAPIで削除
      const response = await fetch(`/api/time-entries/${entryToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "タイムエントリーの削除に失敗しました")
      }
      
      // タイムエントリー一覧を再取得
      await refreshTimeEntries()
      
      // ダイアログを閉じる
      setIsDeleteDialogOpen(false)
      setEntryToDelete(null)
      setIsEditDialogOpen(false)
      setCurrentEntry(null)
      setError(null) // エラーをクリア
    } catch (error: any) {
      console.error("タイムエントリーの削除に失敗しました", error)
      setError("タイムエントリーの削除に失敗しました")
    }
  }
  
  // タイムエントリー一覧を再取得
  const refreshTimeEntries = async () => {
    let startDate, endDate
    
    if (viewMode === 'month') {
      startDate = format(startOfWeek(firstDayOfMonth, { locale: ja }), "yyyy-MM-dd")
      endDate = format(endOfWeek(lastDayOfMonth, { locale: ja }), "yyyy-MM-dd")
    } else if (viewMode === 'week') {
      startDate = format(firstDayOfWeek, "yyyy-MM-dd")
      endDate = format(lastDayOfWeek, "yyyy-MM-dd")
    } else {
      startDate = format(currentDate, "yyyy-MM-dd")
      endDate = format(currentDate, "yyyy-MM-dd")
    }
    
    const response = await get<TimeEntriesResponse>(
      `/api/time-entries?startDate=${startDate}&endDate=${endDate}`
    )
    
    if (response.timeEntries) {
      setTimeEntries(response.timeEntries)
      
      // タイムエントリーをカレンダーイベントに変換
      const events = response.timeEntries.map(entry => ({
        id: entry.id,
        title: entry.tasks?.title || '無題のタスク',
        projectName: entry.projects?.name || '無題のプロジェクト',
        startTime: new Date(entry.start_time),
        endTime: entry.end_time ? new Date(entry.end_time) : null,
        description: entry.description
      }))
      
      setCalendarEvents(events)
    }
  }

  // 月の最初と最後の日付を取得
  const firstDayOfMonth = startOfMonth(currentDate)
  const lastDayOfMonth = endOfMonth(currentDate)
  
  // 週の最初と最後の日付を取得
  const firstDayOfWeek = startOfWeek(currentDate, { locale: ja })
  const lastDayOfWeek = endOfWeek(currentDate, { locale: ja })
  
  // 表示する日付の範囲を取得
  const dateRange = React.useMemo(() => {
    if (viewMode === 'month') {
      // 月表示の場合、月の最初の日の週の始まりから、月の最後の日の週の終わりまでを表示
      const start = startOfWeek(firstDayOfMonth, { locale: ja })
      const end = endOfWeek(lastDayOfMonth, { locale: ja })
      return eachDayOfInterval({ start, end })
    } else if (viewMode === 'week') {
      // 週表示の場合、現在の週の始まりから終わりまでを表示
      return eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek })
    } else {
      // 日表示の場合、現在の日のみを表示
      return [currentDate]
    }
  }, [currentDate, viewMode, firstDayOfMonth, lastDayOfMonth, firstDayOfWeek, lastDayOfWeek])

  // タイムエントリー一覧を取得
  React.useEffect(() => {
    const fetchTimeEntries = async () => {
      setIsLoading(true)
      try {
        // 表示する期間のタイムエントリーを取得
        let startDate, endDate
        
        if (viewMode === 'month') {
          // 月表示の場合、月の最初の日の週の始まりから、月の最後の日の週の終わりまでを取得
          startDate = format(startOfWeek(firstDayOfMonth, { locale: ja }), "yyyy-MM-dd")
          endDate = format(endOfWeek(lastDayOfMonth, { locale: ja }), "yyyy-MM-dd")
        } else if (viewMode === 'week') {
          // 週表示の場合、現在の週の始まりから終わりまでを取得
          startDate = format(firstDayOfWeek, "yyyy-MM-dd")
          endDate = format(lastDayOfWeek, "yyyy-MM-dd")
        } else {
          // 日表示の場合、現在の日のみを取得
          startDate = format(currentDate, "yyyy-MM-dd")
          endDate = format(currentDate, "yyyy-MM-dd")
        }
        
        const response = await get<TimeEntriesResponse>(
          `/api/time-entries?startDate=${startDate}&endDate=${endDate}`
        )
        
        if (response.timeEntries) {
          setTimeEntries(response.timeEntries)
          
          // タイムエントリーをカレンダーイベントに変換
          const events = response.timeEntries.map(entry => ({
            id: entry.id,
            title: entry.tasks?.title || '無題のタスク',
            projectName: entry.projects?.name || '無題のプロジェクト',
            startTime: new Date(entry.start_time),
            endTime: entry.end_time ? new Date(entry.end_time) : null,
            description: entry.description
          }))
          
          setCalendarEvents(events)
        }
      } catch (error: any) {
        console.error("タイムエントリーの取得に失敗しました", error)
        setError("タイムエントリーの取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTimeEntries()
  }, [currentDate, viewMode]) // 依存配列を簡略化して不要な再レンダリングを防止

  // 前の期間に移動
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(subDays(currentDate, 7))
    } else {
      setCurrentDate(subDays(currentDate, 1))
    }
  }

  // 次の期間に移動
  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7))
    } else {
      setCurrentDate(addDays(currentDate, 1))
    }
  }

  // 今日に移動
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // 特定の日のイベントを取得
  const getEventsForDay = (day: Date) => {
    // 日付の文字列表現（YYYY-MM-DD）を取得
    const dayString = format(day, 'yyyy-MM-dd')
    const dayStart = new Date(dayString + 'T00:00:00')
    const dayEnd = new Date(dayString + 'T23:59:59.999')
    
    // 指定された日のイベントをすべて取得
    return calendarEvents.filter(event => {
      // イベントの開始時間と終了時間を取得
      const eventStartTime = event.startTime
      const eventEndTime = event.endTime || new Date(event.startTime.getTime() + 60 * 60 * 1000) // 終了時間がない場合は開始時間の1時間後とする
      
      // 以下のいずれかの条件を満たすイベントを表示
      // 1. イベントの開始日が指定された日と一致する
      // 2. イベントの終了日が指定された日と一致する
      // 3. イベントの期間（開始日から終了日まで）が指定された日を含む
      return (
        // 1. イベントの開始日が指定された日と一致する
        format(eventStartTime, 'yyyy-MM-dd') === dayString ||
        // 2. イベントの終了日が指定された日と一致する
        format(eventEndTime, 'yyyy-MM-dd') === dayString ||
        // 3. イベントの期間（開始日から終了日まで）が指定された日を含む
        (eventStartTime < dayStart && eventEndTime > dayEnd)
      )
    })
  }
  
  // イベントの位置とサイズを計算（日表示・週表示用）
  const calculateEventPosition = (event: CalendarEvent, day: Date, dayStart: number = 0, dayEnd: number = 24) => {
    const eventStartTime = event.startTime
    const eventEndTime = event.endTime || new Date(event.startTime.getTime() + 60 * 60 * 1000) // 終了時間がない場合は開始時間の1時間後とする
    
    // 表示する日付の開始時刻と終了時刻
    const dayStartDate = new Date(format(day, 'yyyy-MM-dd') + 'T00:00:00')
    const dayEndDate = new Date(format(day, 'yyyy-MM-dd') + 'T23:59:59.999')
    
    // 日をまたぐイベントの場合、表示する日付に応じた開始時間と終了時間を計算
    let displayStartTime, displayEndTime
    
    // 表示する日付が開始日より前の場合（通常はありえないが念のため）
    if (dayEndDate < eventStartTime) {
      return { top: 0, height: 0 } // 表示しない
    }
    // 表示する日付が終了日より後の場合（通常はありえないが念のため）
    else if (dayStartDate > eventEndTime) {
      return { top: 0, height: 0 } // 表示しない
    }
    // 表示する日付が開始日と終了日の間にある場合
    else {
      // 表示する日付が開始日の場合
      if (format(day, 'yyyy-MM-dd') === format(eventStartTime, 'yyyy-MM-dd')) {
        displayStartTime = eventStartTime
      } else {
        // 表示する日付の開始時刻（00:00:00）
        displayStartTime = dayStartDate
      }
      
      // 表示する日付が終了日の場合
      if (format(day, 'yyyy-MM-dd') === format(eventEndTime, 'yyyy-MM-dd')) {
        displayEndTime = eventEndTime
      } else {
        // 表示する日付の終了時刻（23:59:59.999）
        displayEndTime = dayEndDate
      }
    }
    
    // 開始時間と終了時間を時間単位（小数点以下は分を表す）で取得
    const startHour = Math.max(
      displayStartTime.getHours() + displayStartTime.getMinutes() / 60,
      dayStart
    )
    const endHour = Math.min(
      displayEndTime.getHours() + displayEndTime.getMinutes() / 60 + (displayEndTime.getSeconds() > 0 ? 1/60 : 0),
      dayEnd
    )
    
    // 表示範囲内の時間の長さ
    const totalHours = dayEnd - dayStart
    
    // 開始位置（上からの割合）
    const top = ((startHour - dayStart) / totalHours) * 100
    
    // 高さ（時間の長さの割合）
    const height = ((endHour - startHour) / totalHours) * 100
    
    return { top, height }
  }

  // 月表示のレンダリング
  const renderMonthView = () => {
    const weekDays = ['日', '月', '火', '水', '木', '金', '土']
    
    return (
      <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
        {/* 曜日のヘッダー */}
        {weekDays.map((day, i) => (
          <div 
            key={i} 
            className={`
              p-2 text-center font-medium border-b
              ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}
            `}
          >
            {day}
          </div>
        ))}
        
        {/* 日付のグリッド */}
        {dateRange.map((date, i) => {
          const isCurrentMonth = date.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(date, new Date())
          const dayEvents = getEventsForDay(date)
          
          return (
            <div 
              key={i} 
              className={`
                min-h-[100px] p-1 border-b border-r
                ${isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'}
                ${isToday ? 'bg-blue-50' : ''}
                ${getDay(date) === 0 ? 'border-l' : ''}
              `}
            >
              <div className="text-right p-1">
                {format(date, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    className="text-xs p-1 rounded bg-blue-100 truncate cursor-pointer hover:bg-blue-200"
                    title={`${event.title} (${event.projectName})`}
                    onClick={() => editTimeEntry(event.id)}
                  >
                    {format(event.startTime, 'HH:mm')} {event.title}
                  </div>
                ))}
                
                {dayEvents.length > 3 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="text-xs text-gray-500 p-1 cursor-pointer hover:bg-gray-100 rounded">
                        他 {dayEvents.length - 3} 件
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2">
                      <div className="font-medium mb-2">
                        {format(date, 'yyyy年M月d日 (E)', { locale: ja })}のタスク
                      </div>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {dayEvents.map(event => (
                          <div 
                            key={event.id}
                            className="text-sm p-2 rounded bg-blue-50 cursor-pointer hover:bg-blue-100"
                            onClick={() => {
                              editTimeEntry(event.id);
                            }}
                          >
                            <div className="font-medium">
                              {format(event.startTime, 'HH:mm')} - {event.endTime ? format(event.endTime, 'HH:mm') : '進行中'}
                            </div>
                            <div>{event.title}</div>
                            <div className="text-blue-500 text-xs">{event.projectName}</div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )
        })}
    </div>
  )
}

  // 週表示のレンダリング
  const renderWeekView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const gridTemplateColumns = "80px repeat(7, 1fr)"
    
    return (
      <div className="border rounded-lg overflow-hidden">
        {/* 曜日のヘッダー */}
        <div className="grid border-b" style={{ gridTemplateColumns }}>
          <div className="p-2 border-r"></div>
          {dateRange.map((date, i) => (
            <div 
              key={i} 
              className={`
                p-2 text-center font-medium border-r
                ${isSameDay(date, new Date()) ? 'bg-blue-50' : ''}
                ${getDay(date) === 0 ? 'text-red-500' : getDay(date) === 6 ? 'text-blue-500' : ''}
              `}
            >
              {format(date, 'M/d (E)', { locale: ja })}
            </div>
          ))}
        </div>
        
        <div className="relative">
          {/* 時間ごとのグリッド（背景） */}
          <div>
            {hours.map(hour => (
              <div key={hour} className="grid border-b" style={{ gridTemplateColumns }}>
                <div className="border-r py-6 px-2 text-right text-sm text-gray-500">
                  {String(hour).padStart(2, '0')}:00
                </div>
                
                {dateRange.map((date, i) => (
                  <div 
                    key={i} 
                    className={`
                      border-r h-16
                      ${isSameDay(date, new Date()) ? 'bg-blue-50' : ''}
                    `}
                  />
                ))}
              </div>
            ))}
          </div>
          
          {/* イベントの表示（絶対位置で配置） */}
          {dateRange.map((date, dayIndex) => {
            const dayEvents = getEventsForDay(date)
            
            return dayEvents.map(event => {
              const { top, height } = calculateEventPosition(event, date)
              
              // 各列の幅を計算（最初の時間列は80px、残りの7列で均等に分割）
              const columnWidth = `calc((100% - 80px) / 7)`
              const leftPosition = `calc(80px + (${dayIndex} * ${columnWidth}))`
              
              return (
                <div 
                  key={event.id}
                  className="absolute rounded bg-blue-100 cursor-pointer hover:bg-blue-200 overflow-hidden text-xs"
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    left: leftPosition,
                    width: `calc(${columnWidth} - 4px)`,
                    zIndex: 10
                  }}
                  title={`${event.title} (${event.projectName})`}
                  onClick={() => editTimeEntry(event.id)}
                >
                  <div className="p-1">
                    <div className="font-medium truncate">
                      {format(event.startTime, 'HH:mm')} - {event.endTime ? format(event.endTime, 'HH:mm') : '進行中'}
                    </div>
                    <div className="truncate">{event.title}</div>
                    <div className="truncate text-blue-500">{event.projectName}</div>
                  </div>
                </div>
              )
            })
          })}
        </div>
      </div>
    )
  }

  // 日表示のレンダリング
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const dayEvents = getEventsForDay(currentDate)
    const gridTemplateColumns = "80px 1fr"
    
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="relative">
          {/* 時間ごとのグリッド（背景） */}
          {hours.map(hour => (
            <div key={hour} className="grid border-b" style={{ gridTemplateColumns }}>
              <div className="border-r py-6 px-2 text-right text-sm text-gray-500">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="h-16" />
            </div>
          ))}
          
          {/* イベントの表示（絶対位置で配置） */}
          {dayEvents.map(event => {
            const { top, height } = calculateEventPosition(event, currentDate)
            
            return (
              <div 
                key={event.id}
                className="absolute rounded bg-blue-100 cursor-pointer hover:bg-blue-200 overflow-auto"
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  left: '80px',
                  width: 'calc(100% - 80px - 4px)',
                  zIndex: 10
                }}
                onClick={() => editTimeEntry(event.id)}
              >
                <div className="p-2">
                  <div className="font-medium">
                    {format(event.startTime, 'HH:mm')} - {event.endTime ? format(event.endTime, 'HH:mm') : '進行中'} {event.title}
                  </div>
                  <div className="text-sm text-blue-500">{event.projectName}</div>
                  {event.description && (
                    <div className="text-sm text-gray-600 mt-1">{event.description}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">読み込み中...</div>
  }
  
  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="calendar" />
        <div className="flex-1">
          <div className="border-b p-4">
            <div className="flex items-center gap-4">
              <div className="flex rounded-md border">
                <Button 
                  variant={viewMode === 'month' ? "default" : "ghost"} 
                  className="rounded-none border-r"
                  onClick={() => setViewMode('month')}
                >
                  月
                </Button>
                <Button 
                  variant={viewMode === 'week' ? "default" : "ghost"} 
                  className="rounded-none border-r"
                  onClick={() => setViewMode('week')}
                >
                  週
                </Button>
                <Button 
                  variant={viewMode === 'day' ? "default" : "ghost"} 
                  className="rounded-none"
                  onClick={() => setViewMode('day')}
                >
                  日
                </Button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToToday}>今日</Button>
                <Button variant="outline" size="icon" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-medium">
                {viewMode === 'month' && format(currentDate, 'yyyy年M月', { locale: ja })}
                {viewMode === 'week' && `${format(firstDayOfWeek, 'yyyy年M月d日', { locale: ja })} - ${format(lastDayOfWeek, 'M月d日', { locale: ja })}`}
                {viewMode === 'day' && format(currentDate, 'yyyy年M月d日 (E)', { locale: ja })}
              </h2>
              <div className="text-sm text-gray-500">
                {(() => {
                  // 表示範囲内のエントリー数をカウント
                  let count = 0;
                  if (viewMode === 'month') {
                    // 月表示の場合、表示されている日付範囲内のエントリーをカウント
                    dateRange.forEach(date => {
                      count += getEventsForDay(date).length;
                    });
                  } else if (viewMode === 'week') {
                    // 週表示の場合、週の範囲内のエントリーをカウント
                    dateRange.forEach(date => {
                      count += getEventsForDay(date).length;
                    });
                  } else {
                    // 日表示の場合、その日のエントリーをカウント
                    count = getEventsForDay(currentDate).length;
                  }
                  return `${count}件のタイムエントリー`;
                })()}
              </div>
            </div>

            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </div>
        </div>
      </div>
      
      {/* 編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タイムエントリーの編集</DialogTitle>
            <DialogDescription>
              タイムエントリーの詳細を編集します。
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="description" className="text-right">
                コメント
              </label>
              <Textarea
                id="description"
                value={currentEntry?.description || ""}
                onChange={(e) => setCurrentEntry(prev => prev ? {...prev, description: e.target.value} : null)}
                className="col-span-3"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="project" className="text-right">
                プロジェクト
              </label>
              <Select 
                value={currentEntry?.project_id || ""}
                onValueChange={async (value) => {
                  // プロジェクトが変更されたら、そのプロジェクトのタスクを取得
                  try {
                    const response = await get<TasksResponse>(`/api/tasks?projectId=${value}`);
                    if (response.tasks) {
                      // 自分に割り当てられたタスクのみをフィルタリング
                      const myTasks = response.tasks.filter(task => 
                        task.task_assignees && 
                        task.task_assignees.some(assignee => assignee.profiles.id === assignee.user_id)
                      );
                      setAvailableTasks(myTasks);
                    }
                    
                    // プロジェクト情報を取得
                    const selectedProject = projects.find(p => p.id === value);
                    
                    setCurrentEntry(prev => prev ? {
                      ...prev, 
                      project_id: value,
                      projects: {
                        id: value,
                        name: selectedProject?.name || ""
                      },
                      task_id: "", // プロジェクトが変わったらタスクをリセット
                      tasks: undefined
                    } : null);
                  } catch (error: any) {
                    console.error("タスクの取得に失敗しました", error);
                    setError("タスクの取得に失敗しました");
                  }
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="プロジェクト" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task" className="text-right">
                タスク *
              </label>
              <Select 
                value={currentEntry?.task_id || ""}
                onValueChange={(value) => {
                  const selectedTask = availableTasks.find(t => t.id === value);
                  setCurrentEntry(prev => prev ? {
                    ...prev, 
                    task_id: value,
                    tasks: {
                      id: value,
                      title: selectedTask?.title || ""
                    }
                  } : null);
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="タスク" />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.length > 0 ? (
                    availableTasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-tasks" disabled>
                      タスクがありません
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="startTime" className="text-right">
                開始時間
              </label>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        {currentEntry?.start_time ? format(new Date(currentEntry.start_time), 'yyyy/MM/dd') : '日付を選択'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={currentEntry?.start_time ? new Date(currentEntry.start_time) : undefined}
                        onSelect={(date) => {
                          if (date && currentEntry) {
                            const currentStartTime = new Date(currentEntry.start_time);
                            const newDate = new Date(date);
                            newDate.setHours(
                              currentStartTime.getHours(),
                              currentStartTime.getMinutes()
                            );
                            
                            // 開始時間が変更された場合、終了時間との関係をチェック
                            if (currentEntry.end_time) {
                              const endTime = new Date(currentEntry.end_time);
                              // 新しい開始時間が終了時間より後の場合、終了時間を調整
                              if (newDate >= endTime) {
                                // 開始時間の1時間後を終了時間に設定
                                const newEndTime = new Date(newDate);
                                newEndTime.setHours(newEndTime.getHours() + 1);
                                
                                setCurrentEntry({
                                  ...currentEntry, 
                                  start_time: newDate.toISOString(),
                                  end_time: newEndTime.toISOString()
                                });
                                return;
                              }
                            }
                            
                            setCurrentEntry({
                              ...currentEntry, 
                              start_time: newDate.toISOString()
                            });
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Select
                    value={currentEntry?.start_time 
                      ? String(new Date(currentEntry.start_time).getHours()).padStart(2, '0')
                      : "00"}
                    onValueChange={(value) => {
                      if (currentEntry) {
                        const currentDate = new Date(currentEntry.start_time);
                        currentDate.setHours(parseInt(value, 10));
                        
                        // 開始時間が終了時間より後の場合、終了時間を調整
                        if (currentEntry.end_time) {
                          const endTime = new Date(currentEntry.end_time);
                          if (currentDate >= endTime) {
                            // 開始時間の1時間後を終了時間に設定
                            const newEndTime = new Date(currentDate);
                            newEndTime.setHours(newEndTime.getHours() + 1);
                            
                            setCurrentEntry({
                              ...currentEntry, 
                              start_time: currentDate.toISOString(),
                              end_time: newEndTime.toISOString()
                            });
                            return;
                          }
                        }
                        
                        setCurrentEntry({
                          ...currentEntry,
                          start_time: currentDate.toISOString()
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i).padStart(2, '0')}>
                          {String(i).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span>:</span>
                  
                  <Select
                    value={currentEntry?.start_time 
                      ? String(new Date(currentEntry.start_time).getMinutes()).padStart(2, '0')
                      : "00"}
                    onValueChange={(value) => {
                      if (currentEntry) {
                        const currentDate = new Date(currentEntry.start_time);
                        currentDate.setMinutes(parseInt(value, 10));
                        
                        // 開始時間が終了時間より後の場合、終了時間を調整
                        if (currentEntry.end_time) {
                          const endTime = new Date(currentEntry.end_time);
                          if (currentDate >= endTime) {
                            // 開始時間の1時間後を終了時間に設定
                            const newEndTime = new Date(currentDate);
                            newEndTime.setHours(newEndTime.getHours() + 1);
                            
                            setCurrentEntry({
                              ...currentEntry, 
                              start_time: currentDate.toISOString(),
                              end_time: newEndTime.toISOString()
                            });
                            return;
                          }
                        }
                        
                        setCurrentEntry({
                          ...currentEntry,
                          start_time: currentDate.toISOString()
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => (
                        <SelectItem key={i} value={String(i).padStart(2, '0')}>
                          {String(i).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="endTime" className="text-right">
                終了時間
              </label>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        {currentEntry?.end_time ? format(new Date(currentEntry.end_time), 'yyyy/MM/dd') : '日付を選択'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={currentEntry?.end_time ? new Date(currentEntry.end_time) : undefined}
                        onSelect={(date) => {
                          if (date && currentEntry) {
                            const endTimeDate = currentEntry.end_time ? new Date(currentEntry.end_time) : new Date();
                            const newDate = new Date(date);
                            newDate.setHours(
                              endTimeDate.getHours(),
                              endTimeDate.getMinutes()
                            );
                            
                            // 終了時間が開始時間より前の場合は調整
                            if (currentEntry.start_time) {
                              const startTime = new Date(currentEntry.start_time);
                              if (newDate <= startTime) {
                                // 開始時間の1時間後を終了時間に設定
                                const adjustedEndTime = new Date(startTime);
                                adjustedEndTime.setHours(adjustedEndTime.getHours() + 1);
                                
                                setCurrentEntry({
                                  ...currentEntry, 
                                  end_time: adjustedEndTime.toISOString()
                                });
                                return;
                              }
                            }
                            
                            setCurrentEntry({
                              ...currentEntry, 
                              end_time: newDate.toISOString()
                            });
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Select
                    value={currentEntry?.end_time 
                      ? String(new Date(currentEntry.end_time).getHours()).padStart(2, '0')
                      : "00"}
                    onValueChange={(value) => {
                      if (currentEntry && currentEntry.end_time) {
                        const currentDate = new Date(currentEntry.end_time);
                        currentDate.setHours(parseInt(value, 10));
                        
                        // 終了時間が開始時間より前の場合は調整
                        if (currentEntry.start_time) {
                          const startTime = new Date(currentEntry.start_time);
                          if (currentDate <= startTime) {
                            // 開始時間の1時間後を終了時間に設定
                            const adjustedEndTime = new Date(startTime);
                            adjustedEndTime.setHours(adjustedEndTime.getHours() + 1);
                            
                            setCurrentEntry({
                              ...currentEntry, 
                              end_time: adjustedEndTime.toISOString()
                            });
                            return;
                          }
                        }
                        
                        setCurrentEntry({
                          ...currentEntry,
                          end_time: currentDate.toISOString()
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i).padStart(2, '0')}>
                          {String(i).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span>:</span>
                  
                  <Select
                    value={currentEntry?.end_time 
                      ? String(new Date(currentEntry.end_time).getMinutes()).padStart(2, '0')
                      : "00"}
                    onValueChange={(value) => {
                      if (currentEntry && currentEntry.end_time) {
                        const currentDate = new Date(currentEntry.end_time);
                        currentDate.setMinutes(parseInt(value, 10));
                        
                        // 終了時間が開始時間より前の場合は調整
                        if (currentEntry.start_time) {
                          const startTime = new Date(currentEntry.start_time);
                          if (currentDate <= startTime) {
                            // 開始時間の1時間後を終了時間に設定
                            const adjustedEndTime = new Date(startTime);
                            adjustedEndTime.setHours(adjustedEndTime.getHours() + 1);
                            
                            setCurrentEntry({
                              ...currentEntry, 
                              end_time: adjustedEndTime.toISOString()
                            });
                            return;
                          }
                        }
                        
                        setCurrentEntry({
                          ...currentEntry,
                          end_time: currentDate.toISOString()
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => (
                        <SelectItem key={i} value={String(i).padStart(2, '0')}>
                          {String(i).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex w-full">
            <Button variant="destructive" onClick={confirmDeleteEntry} className="mr-auto">
              削除
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={saveTimeEntry}>
                保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タイムエントリーの削除</DialogTitle>
            <DialogDescription>
              このタイムエントリーを削除してもよろしいですか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={deleteTimeEntry}>
              削除
            </Button>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
