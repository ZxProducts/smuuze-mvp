"use client"

import * as React from "react"
import { format, formatDistance, formatDuration, intervalToDuration } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Play, Square, Edit, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { get, post, put, del } from "@/lib/api-client"
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
import { Calendar } from "@/components/ui/calendar"

// APIレスポンスの型定義
type ProjectsResponse = {
  projects: Project[]
}

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

// 日付ごとにグループ化されたエントリー
interface EntryGroup {
  date: string
  entries: TimeEntry[]
}

export function TimeTrackerContent() {
  const [description, setDescription] = React.useState("")
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("")
  const [selectedTaskId, setSelectedTaskId] = React.useState<string>("")
  const [projects, setProjects] = React.useState<Project[]>([])
  const [availableTasks, setAvailableTasks] = React.useState<Task[]>([])
  const [isTimerRunning, setIsTimerRunning] = React.useState(false)
  const [timerStartTime, setTimerStartTime] = React.useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = React.useState("00:00:00")
  const [timeEntries, setTimeEntries] = React.useState<TimeEntry[]>([])
  const [currentEntry, setCurrentEntry] = React.useState<TimeEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  // 削除確認用の状態
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [entryToDelete, setEntryToDelete] = React.useState<string | null>(null)

  // プロジェクト一覧を取得
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await get<ProjectsResponse>("/api/projects")
        if (response.projects) {
          setProjects(response.projects)
          
          // 最初のプロジェクトを選択
          if (response.projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(response.projects[0].id)
          }
        }
      } catch (error: any) {
        console.error("プロジェクトの取得に失敗しました", error)
        setError("プロジェクトの取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProjects()
  }, [])
  
  // プロジェクト選択時にタスクを取得
  React.useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedProjectId) {
        setAvailableTasks([])
        setSelectedTaskId("")
        return
      }
      
      try {
        // 自分に割り当てられたタスクを取得
        const response = await get<TasksResponse>(`/api/tasks?projectId=${selectedProjectId}`)
        if (response.tasks) {
          // 自分に割り当てられたタスクのみをフィルタリング
          const myTasks = response.tasks.filter(task => 
            task.task_assignees && 
            task.task_assignees.some(assignee => assignee.profiles.id === assignee.user_id)
          )
          setAvailableTasks(myTasks)
          
          // タスクが変わるので選択をリセット
          setSelectedTaskId("")
        }
      } catch (error: any) {
        console.error("タスクの取得に失敗しました", error)
        setError("タスクの取得に失敗しました")
      }
    }
    
    fetchTasks()
  }, [selectedProjectId])
  
  // タイムエントリー一覧を取得
  React.useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        // 過去7日間のタイムエントリーを取得
        const today = new Date()
        const oneWeekAgo = new Date(today)
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        
        const startDate = format(oneWeekAgo, "yyyy-MM-dd")
        
        const response = await get<TimeEntriesResponse>(`/api/time-entries?startDate=${startDate}`)
        if (response.timeEntries) {
          setTimeEntries(response.timeEntries)
          
          // 進行中のタイムエントリーがあるか確認（end_timeがnullのエントリー）
          const runningEntry = response.timeEntries.find(entry => entry.end_time === null)
          
          if (runningEntry) {
            // 進行中のエントリーがある場合、タイマーの状態を設定
            setIsTimerRunning(true)
            setTimerStartTime(new Date(runningEntry.start_time))
            setCurrentEntry(runningEntry)
            
            // 関連するフィールドも設定
            if (runningEntry.project_id) {
              setSelectedProjectId(runningEntry.project_id)
            }
            
            if (runningEntry.task_id) {
              setSelectedTaskId(runningEntry.task_id)
            }
            
            if (runningEntry.description) {
              setDescription(runningEntry.description)
            }
          }
        }
      } catch (error: any) {
        console.error("タイムエントリーの取得に失敗しました", error)
        setError("タイムエントリーの取得に失敗しました")
      }
    }
    
    fetchTimeEntries()
  }, [])

  // タイマーの開始/停止
  const toggleTimer = () => {
    if (isTimerRunning) {
      // タイマーを停止
      stopTimer();
    } else {
      // タイマーを開始
      if (!selectedTaskId) {
        // タスクが選択されていない場合は開始しない
        alert("タスクを選択してください");
        return;
      }
      startTimer();
    }
  }

  // タイマーを開始
  const startTimer = async () => {
    if (!selectedProjectId || !selectedTaskId) {
      alert("プロジェクトとタスクを選択してください");
      return;
    }
    
    const now = new Date();
    setTimerStartTime(now);
    setIsTimerRunning(true);
    
    try {
      // タイムエントリーをAPIで作成
      const payload = {
        description: description || null,
        projectId: selectedProjectId,
        taskId: selectedTaskId,
        startTime: now.toISOString(),
      };
      
      const response = await post<TimeEntryResponse>("/api/time-entries", payload);
      
      if (response.timeEntry) {
        // 選択されたプロジェクトとタスクの情報を取得
        const selectedProject = projects.find(p => p.id === selectedProjectId);
        const selectedTask = availableTasks.find(t => t.id === selectedTaskId);
        
        // 現在のエントリーを設定
        const newEntry = {
          ...response.timeEntry,
          projects: {
            id: selectedProjectId,
            name: selectedProject?.name || ""
          },
          tasks: {
            id: selectedTaskId,
            title: selectedTask?.title || ""
          }
        };
        
        setCurrentEntry(newEntry);
      }
    } catch (error: any) {
      console.error("タイムエントリーの作成に失敗しました", error);
      setError("タイムエントリーの作成に失敗しました");
      setIsTimerRunning(false);
      setTimerStartTime(null);
    }
  }

  // タイマーを停止
  const stopTimer = async () => {
    if (!timerStartTime || !currentEntry) return;
    
    const now = new Date();
    
    try {
      // タイムエントリーをAPIで更新
      const payload = {
        endTime: now.toISOString(),
      };
      
      await put<TimeEntryResponse>(`/api/time-entries/${currentEntry.id}`, payload);
      
      // タイムエントリー一覧を再取得
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const startDate = format(oneWeekAgo, "yyyy-MM-dd");
      
      const response = await get<TimeEntriesResponse>(`/api/time-entries?startDate=${startDate}`);
      if (response.timeEntries) {
        setTimeEntries(response.timeEntries);
      }
      
      // タイマーをリセット
      setIsTimerRunning(false);
      setTimerStartTime(null);
      setElapsedTime("00:00:00");
      setDescription("");
      setSelectedProjectId("");
      setSelectedTaskId("");
      setCurrentEntry(null);
    } catch (error: any) {
      console.error("タイムエントリーの更新に失敗しました", error);
      setError("タイムエントリーの更新に失敗しました");
    }
  }

  // タイマーの更新
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = intervalToDuration({
          start: timerStartTime,
          end: now,
        });
        
        const hours = String(diff.hours || 0).padStart(2, '0');
        const minutes = String(diff.minutes || 0).padStart(2, '0');
        const seconds = String(diff.seconds || 0).padStart(2, '0');
        
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartTime]);

  // タイムエントリーの編集
  const editTimeEntry = async (entry: TimeEntry) => {
    try {
      // タスク一覧を取得
      if (entry.project_id) {
        const response = await get<TasksResponse>(`/api/tasks?projectId=${entry.project_id}`);
        if (response.tasks) {
          // 自分に割り当てられたタスクのみをフィルタリング
          const myTasks = response.tasks.filter(task => 
            task.task_assignees && 
            task.task_assignees.some(assignee => assignee.profiles.id === assignee.user_id)
          );
          setAvailableTasks(myTasks);
        }
      }
      
      setCurrentEntry(entry);
      setIsEditDialogOpen(true);
    } catch (error: any) {
      console.error("タスクの取得に失敗しました", error);
      setError("タスクの取得に失敗しました");
    }
  }

  // 削除確認ダイアログを表示
  const confirmDeleteEntry = (id: string) => {
    setEntryToDelete(id);
    setIsDeleteDialogOpen(true);
  }

  // タイムエントリーの削除
  const deleteTimeEntry = async () => {
    if (!entryToDelete) return;
    
    try {
      await del<{ success: boolean }>(`/api/time-entries/${entryToDelete}`);
      
      // タイムエントリー一覧を再取得
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const startDate = format(oneWeekAgo, "yyyy-MM-dd");
      
      const response = await get<TimeEntriesResponse>(`/api/time-entries?startDate=${startDate}`);
      if (response.timeEntries) {
        setTimeEntries(response.timeEntries);
      }
      
      // 削除確認ダイアログを閉じる
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (error: any) {
      console.error("タイムエントリーの削除に失敗しました", error);
      setError("タイムエントリーの削除に失敗しました");
    }
  }

  // 開始時間と終了時間の関係を検証
  const validateTimeRange = (startTime: string, endTime: string | null): boolean => {
    if (!endTime) return true; // 終了時間がない場合は有効
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return end > start; // 終了時間が開始時間より後であれば有効
  }

  // タイムエントリーの保存
  const saveTimeEntry = async () => {
    if (!currentEntry) return;
    
    // 開始時間と終了時間の関係を検証
    if (currentEntry.end_time && !validateTimeRange(currentEntry.start_time, currentEntry.end_time)) {
      setError("終了時間は開始時間より後である必要があります");
      return;
    }
    
    try {
      // タイムエントリーをAPIで更新
      const payload = {
        description: currentEntry.description,
        projectId: currentEntry.project_id,
        taskId: currentEntry.task_id,
        startTime: currentEntry.start_time,
        endTime: currentEntry.end_time,
      };
      
      await put<TimeEntryResponse>(`/api/time-entries/${currentEntry.id}`, payload);
      
      // タイムエントリー一覧を再取得
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const startDate = format(oneWeekAgo, "yyyy-MM-dd");
      
      const response = await get<TimeEntriesResponse>(`/api/time-entries?startDate=${startDate}`);
      if (response.timeEntries) {
        setTimeEntries(response.timeEntries);
      }
      
      setIsEditDialogOpen(false);
      setCurrentEntry(null);
      setError(null); // エラーをクリア
    } catch (error: any) {
      console.error("タイムエントリーの更新に失敗しました", error);
      setError("タイムエントリーの更新に失敗しました");
    }
  }

  // 合計時間の計算
  const calculateTotalDuration = (entries: TimeEntry[]) => {
    const now = new Date();
    
    const totalSeconds = entries.reduce((total, entry) => {
      if (!entry.start_time) return total;
      
      const startTime = new Date(entry.start_time);
      let endTime: Date;
      
      if (entry.end_time) {
        endTime = new Date(entry.end_time);
      } else {
        // 進行中のエントリーは現在時刻までの時間を計算
        endTime = now;
      }
      
      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      return total + durationInSeconds;
    }, 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 日付が今日かどうかを判定
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  // 今日のエントリーをフィルタリング
  const todayEntries = timeEntries.filter(entry => {
    if (!entry.start_time) return false;
    return isToday(new Date(entry.start_time));
  });

  // エントリーを日付ごとにグループ化
  const groupEntriesByDate = (entries: TimeEntry[]): EntryGroup[] => {
    const groups: { [date: string]: TimeEntry[] } = {};
    
    entries.forEach(entry => {
      if (!entry.start_time) return;
      
      const date = entry.start_time.split('T')[0]; // YYYY-MM-DD形式の日付
      
      if (!groups[date]) {
        groups[date] = [];
      }
      
      groups[date].push(entry);
    });
    
    // 日付の降順でソート
    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        entries: groups[date],
      }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">読み込み中...</div>;
  }
  
  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
  }

  return (
    <div className="flex-1">
      {/* Timer Input */}
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Select 
            value={selectedProjectId} 
            onValueChange={setSelectedProjectId}
            disabled={isTimerRunning}
          >
            <SelectTrigger className="w-[180px]">
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
          
          <Select 
            value={selectedTaskId} 
            onValueChange={setSelectedTaskId}
            disabled={isTimerRunning || !selectedProjectId || availableTasks.length === 0}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="タスク *" />
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
          
          <Input
            placeholder="コメント（任意）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isTimerRunning}
            className="w-[300px]"
          />
          
          <div className="text-xl font-mono">{elapsedTime}</div>
          <Button 
            variant={isTimerRunning ? "destructive" : "default"}
            className={isTimerRunning ? "" : "bg-blue-500 hover:bg-blue-600"}
            onClick={toggleTimer}
          >
            {isTimerRunning ? (
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
      </div>

      {/* Time Entries */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">タイムトラック履歴</h2>
          <div className="text-sm text-gray-500">合計: {calculateTotalDuration(timeEntries)}</div>
        </div>

        {/* 今日のエントリー */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">今日</div>
            <div className="text-sm text-gray-500">合計: {calculateTotalDuration(todayEntries)}</div>
          </div>

          <div className="space-y-2">
            {todayEntries.length > 0 ? (
              todayEntries.map(entry => (
                <TimeEntryItem
                  key={entry.id}
                  entry={entry}
                  onEdit={() => editTimeEntry(entry)}
                  onDelete={() => confirmDeleteEntry(entry.id)}
                />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">今日のタイムエントリーはありません</div>
            )}
          </div>
        </div>

        {/* 過去のエントリー（日付ごとにグループ化） */}
        {groupEntriesByDate(timeEntries.filter(entry => !isToday(new Date(entry.start_time)))).map(group => (
          <div key={group.date} className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">{format(new Date(group.date), 'yyyy年MM月dd日', { locale: ja })}</div>
              <div className="text-sm text-gray-500">合計: {calculateTotalDuration(group.entries)}</div>
            </div>

            <div className="space-y-2">
              {group.entries.map(entry => (
                <TimeEntryItem
                  key={entry.id}
                  entry={entry}
                  onEdit={() => editTimeEntry(entry)}
                  onDelete={() => confirmDeleteEntry(entry.id)}
                />
              ))}
            </div>
          </div>
        ))}
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
                      <Calendar
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
                      <Calendar
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={saveTimeEntry}>
              保存
            </Button>
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

function TimeEntryItem({
  entry,
  onEdit,
  onDelete,
}: {
  entry: TimeEntry
  onEdit: () => void
  onDelete: () => void
}) {
  // 時間の表示形式を整形
  const formatTimeRange = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const startStr = format(startDate, 'HH:mm');
    const endStr = end ? format(new Date(end), 'HH:mm') : '進行中';
    return `${startStr} - ${endStr}`;
  }
  
  // 期間の表示形式を整形
  const formatDurationDisplay = (start: string, end: string | null) => {
    const startDate = new Date(start);
    
    if (!end) {
      // 進行中の場合は現在時刻までの経過時間を計算
      const now = new Date();
      const durationInSeconds = Math.floor((now.getTime() - startDate.getTime()) / 1000);
      
      const hours = Math.floor(durationInSeconds / 3600);
      const minutes = Math.floor((durationInSeconds % 3600) / 60);
      
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    const endDate = new Date(end);
    const durationInSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col p-3 bg-white rounded border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-medium">{entry.tasks?.title}</div>
            <div className="text-sm text-blue-500">{entry.projects?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {formatTimeRange(entry.start_time, entry.end_time)}
          </div>
          <div className="font-mono">{formatDurationDisplay(entry.start_time, entry.end_time)}</div>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {entry.description && (
        <div className="text-sm text-gray-600 mt-2">{entry.description}</div>
      )}
    </div>
  );
}
