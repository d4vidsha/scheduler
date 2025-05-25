import { createFileRoute } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { Check, Circle } from "lucide-react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TasksService } from "@/client/services"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"

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
            {data?.data?.length === 0 && <div>No tasks yet.</div>}
            {data?.data?.map((task) => (
              <Task key={task.id} task={task} />
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}

function Task({
  task,
}: { task: { id: string; title?: string | null; completed?: boolean } }) {
  const [isCompleted, setIsCompleted] = useState(task.completed ?? false)
  return (
    <div className="flex gap-2 shrink-1 border-b py-3">
      <motion.button
        whileTap={{ scale: 1.2 }}
        onTap={() => setIsCompleted(!isCompleted)}
        className="flex-none self-start"
      >
        <div className="grid grid-cols-1 grid-rows-1">
          <Circle className="h-5 w-5 row-start-1 row-end-1 col-start-1 col-end-1" />
          <div className="flex justify-center items-center row-start-1 row-end-1 col-start-1 col-end-1">
            {isCompleted && <Check strokeWidth={4.5} className="h-3 w-3" />}
          </div>
        </div>
      </motion.button>
      <p className="text-sm line-clamp-4 text-ellipsis">{task.title}</p>
    </div>
  )
}

export default Tasks;
