"use client"

import * as React from "react"
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Play, Square, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { get, post, put } from "@/lib/api-client"
import { intervalToDuration } from "date-fns"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

// APIレスポンスの型定義
type TasksResponse = {
  tasks: Task[]
}

type TimeEntriesResponse = {
  timeEntries: TimeEntry[]
}

type TimeEntryResponse = {
  timeEntry: TimeEntry
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

// タスクの型定義
interface Task {
  id: string
  title: string
  description: string | null
  project_id: string
  team_id: string
  due_date: string | null
  created_at: string
  updated_at: string
  projects: {
    id: string
    name: string
  }
  task_assignees: {
    id: string
    user_id: string
    profiles: {
      id: string
      full_name: string
      email: string
    }
  }[]
}

export function MyTasksContent() {
  const [myTasks, setMyTasks] = React.useState<Task[]>([])
  const [activeTimeEntry, setActiveTimeEntry] = React.useState<TimeEntry | null>(null)
  const [elapsedTime, setElapsedTime] = React.useState("00:00:00")
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // 自分に割り当てられたタスクを取得
  React.useEffect(() => {
    const fetchMyTasks = async () => {
      try {
        // 自分に割り当てられたタスクを取得
        const response = await get<TasksResponse>('/api/tasks?assignedToMe=true')
        if (response.tasks) {
          // APIから返されたタスクをそのまま設定
          setMyTasks(response.tasks)
        }
      } catch (error: any) {
        console.error("タスクの取得に失敗しました", error)
        setError("タスクの取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchMyTasks()
  }, [])

  // 進行中のタイムエントリーを取得
  React.useEffect(() => {
    const fetchActiveTimeEntry = async () => {
      try {
        // 過去24時間のタイムエントリーを取得
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        const startDate = format(yesterday, "yyyy-MM-dd")
        
        const response = await get<TimeEntriesResponse>(`/api/time-entries?startDate=${startDate}`)
        if (response.timeEntries) {
          // 進行中のタイムエントリーを探す（end_timeがnullのエントリー）
          const runningEntry = response.timeEntries.find(entry => entry.end_time === null)
          
          if (runningEntry) {
            setActiveTimeEntry(runningEntry)
          }
        }
      } catch (error: any) {
        console.error("タイムエントリーの取得に失敗しました", error)
        setError("タイムエントリーの取得に失敗しました")
      }
    }
    
    fetchActiveTimeEntry()
  }, [])

  // タイマーの更新
  React.useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (activeTimeEntry) {
      const startTime = new Date(activeTimeEntry.start_time)
      
      interval = setInterval(() => {
        const now = new Date()
        const diff = intervalToDuration({
          start: startTime,
          end: now,
        })
        
        const hours = String(diff.hours || 0).padStart(2, '0')
        const minutes = String(diff.minutes || 0).padStart(2, '0')
        const seconds = String(diff.seconds || 0).padStart(2, '0')
        
        setElapsedTime(`${hours}:${minutes}:${seconds}`)
      }, 1000)
    }
    
    return () => clearInterval(interval)
  }, [activeTimeEntry])

  // タイムトラッキングの開始
  const startTimeTracking = async (task: Task) => {
    if (activeTimeEntry) {
      // 既に進行中のタイムエントリーがある場合は停止する
      await stopTimeTracking()
    }
    
    try {
      const now = new Date()
      
      // タイムエントリーをAPIで作成
      const payload = {
        description: null,
        projectId: task.project_id,
        taskId: task.id,
        startTime: now.toISOString(),
      }
      
      const response = await post<TimeEntryResponse>("/api/time-entries", payload)
      
      if (response.timeEntry) {
        // 現在のエントリーを設定
        const newEntry = {
          ...response.timeEntry,
          projects: {
            id: task.project_id,
            name: task.projects.name
          },
          tasks: {
            id: task.id,
            title: task.title
          }
        }
        
        setActiveTimeEntry(newEntry)
      }
    } catch (error: any) {
      console.error("タイムエントリーの作成に失敗しました", error)
      setError("タイムエントリーの作成に失敗しました")
    }
  }

  // タイムトラッキングの停止
  const stopTimeTracking = async () => {
    if (!activeTimeEntry) return
    
    try {
      const now = new Date()
      
      // タイムエントリーをAPIで更新
      const payload = {
        endTime: now.toISOString(),
      }
      
      await put<TimeEntryResponse>(`/api/time-entries/${activeTimeEntry.id}`, payload)
      
      // タイマーをリセット
      setActiveTimeEntry(null)
      setElapsedTime("00:00:00")
    } catch (error: any) {
      console.error("タイムエントリーの更新に失敗しました", error)
      setError("タイムエントリーの更新に失敗しました")
    }
  }

  // タスクのトグル（開始または停止）
  const toggleTask = (task: Task) => {
    if (activeTimeEntry && activeTimeEntry.task_id === task.id) {
      // 同じタスクが進行中の場合は停止
      stopTimeTracking()
    } else {
      // それ以外の場合は開始
      startTimeTracking(task)
    }
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
        <Sidebar activePage="my-tasks" />
        <div className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">マイタスク</h1>
            {activeTimeEntry && (
              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-md">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-blue-700">現在のタスク: {activeTimeEntry.tasks?.title}</span>
                <span className="font-mono text-blue-700">{elapsedTime}</span>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={stopTimeTracking}
                  className="ml-2"
                >
                  <Square className="mr-1 h-3 w-3" />
                  停止
                </Button>
              </div>
            )}
          </div>
          
          {myTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTasks.map(task => (
                <Card 
                  key={task.id} 
                  className={`cursor-pointer transition-all ${
                    activeTimeEntry && activeTimeEntry.task_id === task.id 
                      ? 'border-blue-500 shadow-md' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleTask(task)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      {activeTimeEntry && activeTimeEntry.task_id === task.id && (
                        <Badge className="bg-blue-500">進行中</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-blue-600 mb-2">{task.projects.name}</div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                    )}
                    {task.due_date && (
                      <div className="text-xs text-gray-500">
                        期限: {format(new Date(task.due_date), "yyyy年MM月dd日", { locale: ja })}
                      </div>
                    )}
                    <div className="mt-3">
                      <Button 
                        variant={activeTimeEntry && activeTimeEntry.task_id === task.id ? "destructive" : "default"}
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTask(task)
                        }}
                      >
                        {activeTimeEntry && activeTimeEntry.task_id === task.id ? (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            停止
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            開始
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p className="mb-2">割り当てられたタスクがありません</p>
              <p className="text-sm">タスク管理画面でタスクを割り当ててください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
