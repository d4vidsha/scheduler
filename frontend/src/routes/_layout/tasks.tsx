import { TasksService } from "@/client/services"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { TaskList } from "@/components/tasks/TaskList"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tasks")({
  component: Tasks,
})

function Tasks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => TasksService.readTasks(),
  })

  return (
    <div className="flex-1 bg-surface p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-on-surface">
            Inbox
          </h1>
          <p className="text-on-surface-variant text-sm font-medium mt-1">
            All your tasks in one place
          </p>
        </header>
        <div className="mb-6">
          <AddTaskForm />
        </div>
        <main>
          {isLoading && (
            <div className="text-sm text-on-surface-variant">Loading...</div>
          )}
          {error && (
            <div className="text-sm text-error">Error loading tasks</div>
          )}
          {data?.data && <TaskList tasks={data.data} />}
        </main>
      </div>
    </div>
  )
}

export default Tasks
