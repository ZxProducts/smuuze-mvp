import Link from "next/link"
import { Clock, Calendar, LayoutDashboard, BarChart2, FolderGit2, Users2, CheckSquare, ListTodo } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Sidebar({ activePage }: { activePage: string }) {
  return (
    <div className="w-64 border-r bg-gray-50">
      <nav className="flex flex-col gap-1 p-2">
        <Button variant={activePage === "time-tracker" ? "secondary" : "ghost"} className="justify-start gap-2" asChild>
          <Link href="/time-tracker">
            <Clock className="h-4 w-4" />
            タイムトラッカー
          </Link>
        </Button>
        <Button variant={activePage === "calendar" ? "secondary" : "ghost"} className="justify-start gap-2" asChild>
          <Link href="/calendar">
            <Calendar className="h-4 w-4" />
            カレンダー
          </Link>
        </Button>
        <Button variant={activePage === "my-tasks" ? "secondary" : "ghost"} className="justify-start gap-2" asChild>
          <Link href="/my-tasks">
            <ListTodo className="h-4 w-4" />
            マイタスク
          </Link>
        </Button>

        <div className="px-3 pt-4 pb-2 text-xs text-gray-500">分析</div>

        <Button variant={activePage === "dashboard" ? "secondary" : "ghost"} className="justify-start gap-2" asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </Link>
        </Button>
        <Button variant={activePage === "reports" ? "secondary" : "ghost"} className="justify-start gap-2" asChild>
          <Link href="/reports">
            <BarChart2 className="h-4 w-4" />
            レポート
          </Link>
        </Button>

        <div className="px-3 pt-4 pb-2 text-xs text-gray-500">管理</div>
        <Button variant={activePage === "tasks" ? "secondary" : "ghost"} className="justify-start gap-2" asChild>
          <Link href="/tasks">
            <CheckSquare className="h-4 w-4" />
            タスク
          </Link>
        </Button>
        <Button variant={activePage === "projects" ? "secondary" : "ghost"} className="justify-start gap-2" asChild>
          <Link href="/projects">
            <FolderGit2 className="h-4 w-4" />
            プロジェクト
          </Link>
        </Button>
        <Button variant={activePage === "team" ? "secondary" : "ghost"} className="justify-start gap-2" asChild>
          <Link href="/team">
            <Users2 className="h-4 w-4" />
            チーム
          </Link>
        </Button>
      </nav>
    </div>
  )
}
