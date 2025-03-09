import { Metadata } from "next"
import { TasksContent } from "./tasks-content"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"

export const metadata: Metadata = {
  title: "タスク管理 | Smuuze",
  description: "プロジェクトごとのタスクを管理します",
}

export default function TasksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="tasks" />
        <div className="flex-1 p-6">
          <TasksContent />
        </div>
      </div>
    </div>
  )
}
