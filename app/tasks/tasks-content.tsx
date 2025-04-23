"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  CheckSquare, 
  MoreVertical, 
  Plus, 
  Calendar as CalendarIcon 
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { get, post, put, del } from "@/lib/api-client"

// APIレスポンスの型定義
type ProjectsResponse = {
  projects: Project[]
  debug?: string
}

type TeamMembersResponse = {
  members: TeamMember[]
  currentUserId: string
}

type TasksResponse = {
  tasks: Task[]
}

type TaskResponse = {
  task: Task
}

type Project = {
  id: string
  name: string
  team_id: string
}

type TeamMember = {
  id: string
  user_id: string
  team_id: string
  role: string
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

type ProjectMember = {
  id: string
  project_id: string
  user_id: string
  hourly_rate: number
  created_at: string
  updated_at: string
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

type TaskAssignee = {
  id: string
  user_id: string
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

type Task = {
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
  task_assignees: TaskAssignee[]
  project_name?: string
  is_admin?: boolean
}

export function TasksContent() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [userRole, setUserRole] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // タスク追加用の状態
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined)
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([])
  
  // タスク編集用の状態
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState("")
  const [editTaskDescription, setEditTaskDescription] = useState("")
  const [editTaskDueDate, setEditTaskDueDate] = useState<Date | undefined>(undefined)
  const [editTaskAssignees, setEditTaskAssignees] = useState<string[]>([])
  
  // タスク削除用の状態
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string>("")

  // プロジェクト情報を保持する状態
  const [projectAdminStatus, setProjectAdminStatus] = useState<Record<string, boolean>>({})
  
  // プロジェクトメンバーを保持する状態
  const [projectMembers, setProjectMembers] = useState<TeamMember[]>([])
  
  // プロジェクト一覧とタスク一覧を取得
  useEffect(() => {
    const fetchProjectsAndTasks = async () => {
      setIsLoading(true)
      try {
        // プロジェクト一覧を取得
        const projectsResponse = await get<ProjectsResponse>("/api/projects")
        if (projectsResponse.projects) {
          setProjects(projectsResponse.projects)
          
          // 各プロジェクトのタスクと組織メンバーを取得
          const projectsWithTasksPromises = projectsResponse.projects.map(async (project) => {
            try {
              // タスク一覧を取得
              const tasksResponse = await get<TasksResponse>(`/api/tasks?projectId=${project.id}`)
              
              // 組織メンバー一覧を取得
              const membersResponse = await get<TeamMembersResponse>(`/api/teams/${project.team_id}/members`)
              
              // 現在のユーザーの権限を確認
              let isProjectAdmin = false
              if (membersResponse.members) {
                const currentUser = membersResponse.members.find(
                  (member: TeamMember) => member.user_id === membersResponse.currentUserId
                )
                if (currentUser && (currentUser.role === "admin" || currentUser.role === "owner")) {
                  isProjectAdmin = true
                }
              }
              
              return {
                project,
                tasks: tasksResponse.tasks || [],
                members: membersResponse.members || [],
                isAdmin: isProjectAdmin
              }
            } catch (error) {
              console.error(`プロジェクト ${project.id} の情報取得に失敗しました`, error)
              return {
                project,
                tasks: [],
                members: [],
                isAdmin: false
              }
            }
          })
          
          const projectsWithTasks = await Promise.all(projectsWithTasksPromises)
          
          // プロジェクトごとの管理者権限を記録
          const adminStatusMap: Record<string, boolean> = {}
          projectsWithTasks.forEach(p => {
            adminStatusMap[p.project.id] = p.isAdmin
          })
          setProjectAdminStatus(adminStatusMap)
          
          // 全てのタスクを結合
          const allTasks = projectsWithTasks.flatMap(p => p.tasks.map(task => ({
            ...task,
            project_name: p.project.name,
            is_admin: p.isAdmin
          })))
          
          setTasks(allTasks)
          
          // 全ての組織メンバーを結合（重複を排除）
          const allMembersWithDuplicates = projectsWithTasks.flatMap(p => p.members)
          // user_idをキーとして使用して重複を排除
          const uniqueMembers = Array.from(
            new Map(allMembersWithDuplicates.map(member => [member.user_id, member]))
            .values()
          )
          setTeamMembers(uniqueMembers)
          
          // 少なくとも1つのプロジェクトで管理者であるかどうか
          const isAdminForAnyProject = projectsWithTasks.some(p => p.isAdmin)
          setIsAdmin(isAdminForAnyProject)
        }
      } catch (error) {
        console.error("プロジェクトとタスクの取得に失敗しました", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProjectsAndTasks()
  }, [])
  
  // プロジェクトでフィルタリングする処理
  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId)
    
    // プロジェクトが選択された場合、そのプロジェクトのメンバーを取得
    if (projectId && projectId !== "all") {
      try {
        // プロジェクトメンバーを取得
        const response = await get<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`)
        if (response.members) {
          // ProjectMember型をTeamMember型に変換
          const convertedMembers: TeamMember[] = response.members.map(member => ({
            id: member.id,
            user_id: member.user_id,
            team_id: "", // この値は使用しないので空文字列を設定
            role: "", // この値は使用しないので空文字列を設定
            profiles: member.profiles
          }))
          setProjectMembers(convertedMembers)
        }
      } catch (error) {
        console.error("プロジェクトメンバーの取得に失敗しました", error)
        setProjectMembers([])
      }
    } else {
      // 全てのプロジェクトが選択された場合、プロジェクトメンバーをクリア
      setProjectMembers([])
    }
  }
  
  // タスク追加ダイアログを開く関数は削除（各プロジェクトのタスク追加ボタンのクリックハンドラに直接実装）
  
  // タスク追加の処理
  const handleAddTask = async () => {
    if (!newTaskTitle || !selectedProjectId) return
    
    try {
      const payload = {
        title: newTaskTitle,
        description: newTaskDescription,
        projectId: selectedProjectId,
        assigneeIds: newTaskAssignees,
        dueDate: newTaskDueDate ? format(newTaskDueDate, "yyyy-MM-dd") : null
      }
      
      await post<TaskResponse>("/api/tasks", payload)
      
      // タスク一覧を再取得
      const response = await get<TasksResponse>(`/api/tasks?projectId=${selectedProjectId}`)
      if (response.tasks) {
        setTasks(response.tasks)
      }
      
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("タスクの追加に失敗しました", error)
    }
  }
  
  // タスク編集ダイアログを開く
  const openEditDialog = async (task: Task) => {
    setEditingTask(task)
    setEditTaskTitle(task.title)
    setEditTaskDescription(task.description || "")
    setEditTaskDueDate(task.due_date ? new Date(task.due_date) : undefined)
    setEditTaskAssignees(task.task_assignees.map(assignee => assignee.user_id))
    
    // タスクのプロジェクトのメンバーを取得
    try {
      // プロジェクトメンバーを取得
      const response = await get<{ members: ProjectMember[] }>(`/api/projects/${task.project_id}/members`)
      if (response.members) {
        // ProjectMember型をTeamMember型に変換
        const convertedMembers: TeamMember[] = response.members.map(member => ({
          id: member.id,
          user_id: member.user_id,
          team_id: "", // この値は使用しないので空文字列を設定
          role: "", // この値は使用しないので空文字列を設定
          profiles: member.profiles
        }))
        setProjectMembers(convertedMembers)
      }
    } catch (error) {
      console.error("プロジェクトメンバーの取得に失敗しました", error)
      setProjectMembers([])
    }
    
    setIsEditDialogOpen(true)
  }
  
  // タスク編集の処理
  const handleEditTask = async () => {
    if (!editingTask || !editTaskTitle) return
    
    try {
      const payload = {
        title: editTaskTitle,
        description: editTaskDescription,
        assigneeIds: editTaskAssignees,
        dueDate: editTaskDueDate ? format(editTaskDueDate, "yyyy-MM-dd") : null
      }
      
      await put<TaskResponse>(`/api/tasks/${editingTask.id}`, payload)
      
      // タスク一覧を再取得
      const response = await get<TasksResponse>(`/api/tasks?projectId=${selectedProjectId}`)
      if (response.tasks) {
        setTasks(response.tasks)
      }
      
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("タスクの更新に失敗しました", error)
    }
  }
  
  // タスク削除ダイアログを開く
  const openDeleteDialog = (taskId: string) => {
    setDeletingTaskId(taskId)
    setIsDeleteDialogOpen(true)
  }
  
  // タスク削除の処理
  const handleDeleteTask = async () => {
    if (!deletingTaskId) return
    
    try {
      await del<{ success: boolean }>(`/api/tasks/${deletingTaskId}`)
      
      // タスク一覧を再取得
      const response = await get<TasksResponse>(`/api/tasks?projectId=${selectedProjectId}`)
      if (response.tasks) {
        setTasks(response.tasks)
      }
      
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("タスクの削除に失敗しました", error)
    }
  }
  
  // 担当者の選択状態を切り替える
  const toggleAssignee = (userId: string, isAdding: boolean) => {
    if (isAdding) {
      if (newTaskAssignees.includes(userId)) {
        setNewTaskAssignees(newTaskAssignees.filter(id => id !== userId))
      } else {
        setNewTaskAssignees([...newTaskAssignees, userId])
      }
    } else {
      if (editTaskAssignees.includes(userId)) {
        setEditTaskAssignees(editTaskAssignees.filter(id => id !== userId))
      } else {
        setEditTaskAssignees([...editTaskAssignees, userId])
      }
    }
  }
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-full">読み込み中...</div>
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>タスク管理</CardTitle>
          <CardDescription>プロジェクトごとのタスクを管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Label htmlFor="project-select">プロジェクトでフィルター</Label>
            <Select value={selectedProjectId} onValueChange={handleProjectChange}>
              <SelectTrigger id="project-select" className="w-[240px]">
                <SelectValue placeholder="すべてのプロジェクト" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのプロジェクト</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* プロジェクトごとにタスクをグループ化して表示 */}
          {projects.length > 0 ? (
            <div className="space-y-8">
              {projects
                .filter(project => !selectedProjectId || selectedProjectId === "all" || project.id === selectedProjectId)
                .map(project => {
                  // このプロジェクトのタスクをフィルタリング
                  const projectTasks = tasks.filter(task => task.project_id === project.id);
                  
                  // タスクがなくても表示する（特定のプロジェクトが選択されている場合は、そのプロジェクトのみ表示）
                  if (selectedProjectId && selectedProjectId !== "all" && project.id !== selectedProjectId) {
                    return null;
                  }
                  
                  return (
                    <div key={project.id} className="border rounded-md overflow-hidden">
                      <div className="bg-gray-100 p-3 font-medium flex justify-between items-center">
                        <div>{project.name}</div>
                        {projectAdminStatus[project.id] && (
                          <Button size="sm" variant="ghost" onClick={async () => {
                            setSelectedProjectId(project.id);
                            
                            // このプロジェクトのメンバーを取得
                            try {
                              const response = await get<{ members: ProjectMember[] }>(`/api/projects/${project.id}/members`);
                              if (response.members) {
                                // ProjectMember型をTeamMember型に変換
                                const convertedMembers: TeamMember[] = response.members.map(member => ({
                                  id: member.id,
                                  user_id: member.user_id,
                                  team_id: "", // この値は使用しないので空文字列を設定
                                  role: "", // この値は使用しないので空文字列を設定
                                  profiles: member.profiles
                                }));
                                setProjectMembers(convertedMembers);
                              }
                            } catch (error) {
                              console.error("プロジェクトメンバーの取得に失敗しました", error);
                              setProjectMembers([]);
                            }
                            
                            // タスク追加ダイアログを開く
                            setNewTaskTitle("");
                            setNewTaskDescription("");
                            setNewTaskDueDate(undefined);
                            setNewTaskAssignees([]);
                            setIsAddDialogOpen(true);
                          }}>
                            <Plus className="h-4 w-4 mr-1" />
                            タスクを追加
                          </Button>
                        )}
                      </div>
                      
                      {projectTasks.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>タスク名</TableHead>
                              <TableHead>担当者</TableHead>
                              <TableHead>期限</TableHead>
                              <TableHead className="w-[100px]">アクション</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projectTasks.map(task => (
                              <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.title}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {task.task_assignees.map(assignee => (
                                      <Badge key={assignee.id} variant="outline">
                                        {assignee.profiles.full_name}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {task.due_date ? format(new Date(task.due_date), "yyyy年MM月dd日", { locale: ja }) : "-"}
                                </TableCell>
                                <TableCell>
                                  {task.is_admin && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                          <span className="sr-only">メニューを開く</span>
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>アクション</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                          編集
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => openDeleteDialog(task.id)}
                                          className="text-red-600"
                                        >
                                          削除
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          タスクがありません
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              プロジェクトがありません
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* タスク追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>タスクを追加</DialogTitle>
            <DialogDescription>
              新しいタスクの詳細を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">タスク名</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="タスク名を入力"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-description">説明</Label>
              <Textarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="タスクの説明を入力"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>期限</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newTaskDueDate ? (
                      format(newTaskDueDate, "yyyy年MM月dd日", { locale: ja })
                    ) : (
                      <span>日付を選択</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newTaskDueDate}
                    onSelect={setNewTaskDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>担当者</Label>
              <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto">
                {selectedProjectId && selectedProjectId !== "all" ? (
                  projectMembers.length > 0 ? (
                    projectMembers.map(member => (
                      <div key={member.id} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`assignee-${member.user_id}`}
                          checked={newTaskAssignees.includes(member.user_id)}
                          onCheckedChange={() => toggleAssignee(member.user_id, true)}
                        />
                        <Label
                          htmlFor={`assignee-${member.user_id}`}
                          className="cursor-pointer"
                        >
                          {member.profiles.full_name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-gray-500">
                      プロジェクトメンバーがいません
                    </div>
                  )
                ) : (
                  <div className="text-center py-2 text-gray-500">
                    プロジェクトを選択してください
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddTask}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* タスク編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>タスクを編集</DialogTitle>
            <DialogDescription>
              タスクの詳細を編集してください
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-task-title">タスク名</Label>
              <Input
                id="edit-task-title"
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder="タスク名を入力"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-task-description">説明</Label>
              <Textarea
                id="edit-task-description"
                value={editTaskDescription}
                onChange={(e) => setEditTaskDescription(e.target.value)}
                placeholder="タスクの説明を入力"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>期限</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editTaskDueDate ? (
                      format(editTaskDueDate, "yyyy年MM月dd日", { locale: ja })
                    ) : (
                      <span>日付を選択</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editTaskDueDate}
                    onSelect={setEditTaskDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>担当者</Label>
              <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto">
                {editingTask ? (
                  projectMembers.length > 0 ? (
                    projectMembers.map(member => (
                      <div key={member.id} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`edit-assignee-${member.user_id}`}
                          checked={editTaskAssignees.includes(member.user_id)}
                          onCheckedChange={() => toggleAssignee(member.user_id, false)}
                        />
                        <Label
                          htmlFor={`edit-assignee-${member.user_id}`}
                          className="cursor-pointer"
                        >
                          {member.profiles.full_name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-gray-500">
                      プロジェクトメンバーがいません
                    </div>
                  )
                ) : (
                  <div className="text-center py-2 text-gray-500">
                    読み込み中...
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleEditTask}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* タスク削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>タスクを削除</AlertDialogTitle>
            <AlertDialogDescription>
              このタスクを削除してもよろしいですか？この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600 hover:bg-red-700">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
