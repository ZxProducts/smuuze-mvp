import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function TeamPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="team" />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">チーム</h1>
          </div>

          <div className="mb-4 flex">
            <Button variant="ghost" className="rounded-none border-b-2 border-blue-500">
              メンバー
            </Button>
            <Button variant="ghost" className="rounded-none">
              グループ
            </Button>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Button variant="outline">すべて表示</Button>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input className="w-64 pl-9" placeholder="名前またはメールで検索" />
            </div>
          </div>

          <div className="rounded-md border">
            <div className="border-b bg-gray-50 p-3 text-sm">メンバー</div>
            <div className="grid grid-cols-4 border-b bg-gray-50 p-3 text-sm">
              <div className="font-medium">名前</div>
              <div className="font-medium">メール</div>
              <div className="font-medium">役割</div>
              <div className="font-medium">グループ</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>三浦 玄</div>
              <div>k.miura@enhanced.co.jp</div>
              <div>
                <span className="rounded-sm bg-blue-500 px-2 py-0.5 text-xs text-white">オーナー</span>
              </div>
              <div>--</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>中野 紀明</div>
              <div>n.nakano@enhanced.co.jp</div>
              <div>--</div>
              <div>--</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>加藤康弘 (you)</div>
              <div>y.k1994k@gmail.com</div>
              <div>--</div>
              <div>--</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>後藤 浩樹</div>
              <div>kouki7x2dani@gmail.com</div>
              <div>--</div>
              <div>--</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>森川浩太</div>
              <div>kota.m.sg@gmail.com</div>
              <div>--</div>
              <div>--</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>永尾純平</div>
              <div>jpy_rider@hotmail.co.jp</div>
              <div>--</div>
              <div>--</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>知念しおり</div>
              <div>s.chinen@enhanced.co.jp</div>
              <div>--</div>
              <div>--</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>竹内一希</div>
              <div>k.takeuchi@enhanced.co.jp</div>
              <div>--</div>
              <div>--</div>
            </div>
            <div className="grid grid-cols-4 border-b p-3">
              <div>藤原市佑</div>
              <div>m.fujiwara@enhanced.co.jp</div>
              <div>--</div>
              <div>--</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

