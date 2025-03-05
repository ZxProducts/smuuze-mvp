import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function ProjectsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="projects" />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">プロジェクト</h1>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <div>フィルター</div>
            <Button variant="outline">アクティブ</Button>
            <Button variant="outline">クライアント</Button>
            <Button variant="outline">アクセス</Button>
            <Button variant="outline">請求</Button>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input className="w-64 pl-9" placeholder="名前で検索" />
            </div>
            <Button className="bg-blue-500 hover:bg-blue-600">フィルターを適用</Button>
          </div>

          <div className="rounded-md border">
            <div className="border-b bg-gray-50 p-3 text-sm">プロジェクト</div>
            <div className="grid grid-cols-5 border-b bg-gray-50 p-3 text-sm">
              <div className="font-medium">名前</div>
              <div className="font-medium">クライアント</div>
              <div className="font-medium">追跡時間</div>
              <div className="font-medium">進捗</div>
              <div className="font-medium">アクセス</div>
            </div>
            <div className="grid grid-cols-5 border-b p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span>Enhanced AI</span>
              </div>
              <div>--</div>
              <div>23.17h</div>
              <div>--</div>
              <div>プライベート</div>
            </div>
            <div className="grid grid-cols-5 border-b p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                <span>networq</span>
              </div>
              <div>--</div>
              <div>51.97h</div>
              <div>--</div>
              <div>プライベート</div>
            </div>
            <div className="grid grid-cols-5 border-b p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                <span>smuuze</span>
              </div>
              <div>--</div>
              <div>2.19h</div>
              <div>--</div>
              <div>プライベート</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

