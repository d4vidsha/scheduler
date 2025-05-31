import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { TasksService } from "@/client/services"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { TaskList } from "@/components/tasks/TaskList"

export const Route = createFileRoute("/_layout/tasks")({
  component: Tasks,
})

function Tasks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => TasksService.readTasks(),
  })

  return (
    <div className="mx-20 my-10">
      <div className="flex justify-center">
        <div className="flex-col shrink w-[800px] min-w-56">
          <header className="mb-4">
            <h1 className="text-3xl font-bold">Inbox</h1>
          </header>
          <AddTaskForm />
          <main className="flex flex-col mt-6">
            {isLoading && <div>Loading...</div>}
            {error && <div className="text-red-500">Error loading tasks</div>}
            {data?.data && <TaskList tasks={data.data} />}
          </main>
        </div>
      </div>
    </div>
  )
}

export default Tasks;
