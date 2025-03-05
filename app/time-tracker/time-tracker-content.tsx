"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function TimeTrackerContent() {
  const [time, setTime] = React.useState("00:00:00")

  return (
    <div className="flex-1">
      {/* Timer Input */}
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Input placeholder="何の作業をしていますか？" className="flex-1" />
          <Button variant="ghost">プロジェクト</Button>
          <Button variant="ghost">タグ</Button>
          <Button variant="ghost">料金</Button>
          <div className="text-xl font-mono">{time}</div>
          <Button variant="default" className="bg-blue-500 hover:bg-blue-600">
            開始
          </Button>
        </div>
      </div>

      {/* Time Entries */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">今週</h2>
          <div className="text-sm text-gray-500">週合計: 34:30</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm">今日</div>
            <div className="text-sm text-gray-500">合計: 7:00</div>
          </div>

          <div className="space-y-2">
            <TimeEntry
              title="イラスト作成"
              project="ACME"
              time="1:00 PM - 3:00 PM"
              duration="2:00"
              badges={["EUR", "請求済み"]}
            />
            <TimeEntry title="バグ修正 #212" project="プロジェクトX" time="9:30 AM - 1:00 PM" duration="3:30" />
            <TimeEntry
              title="確定申告書類作成"
              project="オフィス"
              time="8:00 AM - 9:30 AM"
              duration="1:30"
              badges={["残業"]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function TimeEntry({
  title,
  project,
  time,
  duration,
  badges = [],
}: {
  title: string
  project: string
  time: string
  duration: string
  badges?: string[]
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded border">
      <div className="flex items-center gap-4">
        <div>
          <div>{title}</div>
          <div className="text-sm text-blue-500">{project}</div>
        </div>
        {badges.map((badge) => (
          <Badge key={badge} variant="secondary" className="text-xs">
            {badge}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-500">{time}</div>
        <div className="font-mono">{duration}</div>
      </div>
    </div>
  )
}

