import Calendar from "@/components/calendar"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { TasksService } from "@/client/services"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import Tasks from "./tasks"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => TasksService.readTasks(),
  })

  const tasks = data?.data ?? []

  return (
    <div className="h-[calc(100vh-65px)] w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel
          defaultSize={35}
          className="min-w-[300px] max-w-[600px]"
        >
          <Tasks />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} className="min-w-[400px]">
          <Calendar tasks={tasks} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
