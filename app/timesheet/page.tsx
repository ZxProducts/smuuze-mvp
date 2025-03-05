import { CalendarIcon, Copy, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function TimesheetPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="timesheet" />
        <div className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">タイムシート</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                8月 26, 2024 - 9月 1, 2024
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="grid grid-cols-8 border-b bg-gray-50 p-2 text-sm">
              <div className="pl-2">プロジェクト</div>
              <div className="text-center">月, 8月 26</div>
              <div className="text-center">火, 8月 27</div>
              <div className="text-center">水, 8月 28</div>
              <div className="text-center">木, 8月 29</div>
              <div className="text-center">金, 8月 30</div>
              <div className="text-center">土, 8月 31</div>
              <div className="text-center">日, 9月 1</div>
            </div>

            <div className="grid grid-cols-8 border-b p-2">
              <div className="flex items-center gap-2 pl-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span>Enhanced AI: AI-24</span>
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:12:50" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
            </div>

            <div className="grid grid-cols-8 border-b p-2">
              <div className="flex items-center gap-2 pl-2">
                <span className="text-blue-500">プロジェクトを選択</span>
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
              <div className="text-center">
                <Input className="h-8 text-center" defaultValue="00:00:00" />
              </div>
            </div>

            <div className="grid grid-cols-8 bg-gray-50 p-2 text-sm">
              <div className="pl-2 font-medium">合計:</div>
              <div className="text-center">00:00:00</div>
              <div className="text-center">00:00:00</div>
              <div className="text-center">00:00:00</div>
              <div className="text-center">00:00:00</div>
              <div className="text-center">00:00:00</div>
              <div className="text-center">00:12:50</div>
              <div className="text-center">00:00:00</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新規行を追加
            </Button>
            <Button variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              前週をコピー
            </Button>
            <Button variant="outline" className="gap-2">
              <Save className="h-4 w-4" />
              テンプレートとして保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

