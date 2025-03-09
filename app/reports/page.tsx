import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ReportsContent } from "./reports-content";

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage="reports" />
        <div className="flex-1">
          <ReportsContent />
        </div>
      </div>
    </div>
  );
}
