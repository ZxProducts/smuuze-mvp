import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="dashboard" />
        <div className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">ダッシュボード</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline">プロジェクト</Button>
              <Button variant="outline">チーム</Button>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                昨年
              </Button>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">合計時間</div>
              <div className="text-2xl font-bold">359:03:19</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">トッププロジェクト</div>
              <div className="text-2xl font-bold">ZXKeiba</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">トップクライアント</div>
              <div className="text-2xl font-bold">--</div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <div className="h-64 w-full bg-gray-100">
              {/* 月別チャート（バーチャート）をここに表示 */}
              <div className="flex h-full items-end justify-between p-4">
                {Array.from({ length: 12 }).map((_, i) => {
                  const height = Math.random() * 80 + 20
                  return (
                    <div key={i} className="flex w-16 flex-col items-center">
                      <div className="w-12 bg-green-500" style={{ height: `${height}%` }}></div>
                      <div className="mt-2 text-xs">{i + 1}月</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="h-64 w-full">
                {/* 円グラフをここに表示 */}
                <div className="flex h-full items-center justify-center">
                  <div className="relative h-48 w-48 rounded-full border-8 border-green-500">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold">359:03:19</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>ZXKeiba</div>
                  <div className="flex items-center gap-2">
                    <div>151:30:36</div>
                    <div className="w-32 bg-gray-200">
                      <div className="h-2 w-2/5 bg-green-500"></div>
                    </div>
                    <div>42.20%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>cheez - verbal and dialogue</div>
                  <div className="flex items-center gap-2">
                    <div>94:13:28</div>
                    <div className="w-32 bg-gray-200">
                      <div className="h-2 w-1/4 bg-orange-500"></div>
                    </div>
                    <div>26.24%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>networq</div>
                  <div className="flex items-center gap-2">
                    <div>34:33:40</div>
                    <div className="w-32 bg-gray-200">
                      <div className="h-2 w-[10%] bg-green-300"></div>
                    </div>
                    <div>9.63%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

