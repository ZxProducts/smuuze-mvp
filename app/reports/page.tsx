import { Printer, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="reports" />
        <div className="flex-1">
          <div className="border-b">
            <div className="flex">
              <Button variant="ghost" className="rounded-none border-b-2 border-blue-500">
                レポート
              </Button>
              <Button variant="ghost" className="rounded-none">
                サマリー
              </Button>
              <Button variant="ghost" className="rounded-none">
                詳細
              </Button>
              <Button variant="ghost" className="rounded-none">
                週次
              </Button>
              <Button variant="ghost" className="rounded-none">
                共有
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline">フィルター</Button>
                <Button variant="outline">チーム</Button>
                <Button variant="outline">クライアント</Button>
                <Button variant="outline">プロジェクト</Button>
                <Button variant="outline">タスク</Button>
                <Button variant="outline">タグ</Button>
                <Button variant="outline">ステータス</Button>
                <Button variant="outline">説明</Button>
              </div>
              <Button className="bg-blue-500 hover:bg-blue-600">フィルターを適用</Button>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-md border bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">合計: 36:16:39</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  エクスポート
                </Button>
                <Button variant="ghost" size="icon">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <Button variant="outline">請求可能</Button>
            </div>

            <div className="mb-6 h-64 w-full bg-gray-100">
              {/* 週間チャート（バーチャート）をここに表示 */}
              <div className="flex h-full items-end justify-between p-4">
                {Array.from({ length: 7 }).map((_, i) => {
                  const height = i < 3 ? Math.random() * 80 + 20 : 0
                  return (
                    <div key={i} className="flex w-32 flex-col items-center">
                      <div className="w-24 bg-green-500" style={{ height: `${height}%` }}></div>
                      <div className="mt-2 text-xs">
                        {["月", "火", "水", "木", "金", "土", "日"][i]}, 8月 {i + 3}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <div>グループ化:</div>
              <Button variant="outline" size="sm">
                プロジェクト
              </Button>
              <Button variant="outline" size="sm">
                説明
              </Button>
            </div>

            <div className="rounded-md border">
              <div className="grid grid-cols-[1fr_200px] border-b bg-gray-50 p-3 text-sm">
                <div className="font-medium">タイトル</div>
                <div className="font-medium text-right">時間</div>
              </div>
              <div className="grid grid-cols-[1fr_200px] border-b p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  <span>Alexion-ePAT - NCT</span>
                </div>
                <div className="text-right">23:49:19</div>
              </div>
              <div className="grid grid-cols-[1fr_200px] border-b p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                  <span>Enhanced</span>
                </div>
                <div className="text-right">01:38:40</div>
              </div>
              <div className="grid grid-cols-[1fr_200px] border-b p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-pink-500"></span>
                  <span>Enhanced Sales</span>
                </div>
                <div className="text-right">02:14:00</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

