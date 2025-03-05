import * as React from "react"
import { CalendarIcon, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function CalendarPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="calendar" />
        <div className="flex-1">
          <div className="border-b p-4">
            <div className="flex items-center gap-4">
              <div className="flex rounded-md border">
                <Button variant="ghost" className="rounded-none border-r">
                  カレンダー
                </Button>
                <Button variant="ghost" className="rounded-none border-r">
                  週
                </Button>
                <Button variant="ghost" className="rounded-none">
                  日
                </Button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline">昨日</Button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
              <div className="ml-auto text-sm text-gray-500">
                火, 8月 4<br />
                00:00:00
              </div>
            </div>

            <div className="grid grid-cols-[80px_1fr] border-t">
              {Array.from({ length: 12 }).map((_, i) => (
                <React.Fragment key={i}>
                  <div className="border-r border-b py-6 px-2 text-right text-sm text-gray-500">
                    {String(i + 1).padStart(2, "0")}:00
                  </div>
                  <div className="border-b py-6"></div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

