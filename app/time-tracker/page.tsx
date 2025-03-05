import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { TimeTrackerContent } from "./time-tracker-content"

export default function TimeTrackerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="time-tracker" />
        <TimeTrackerContent />
      </div>
    </div>
  )
}

