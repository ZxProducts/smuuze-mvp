import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ProjectsContent } from "./projects-content"

export default function ProjectsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="projects" />
        <ProjectsContent />
      </div>
    </div>
  )
}
