import { createFileRoute } from "@tanstack/react-router"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import Calendar from "@/components/calendar"
import Tasks from "./tasks"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="h-[calc(100vh-65px)] w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={35} className="min-w-[300px] max-w-[600px]">
          <Tasks />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} className="min-w-[400px]">
          <Calendar />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
