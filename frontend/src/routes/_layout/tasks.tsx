import { createFileRoute } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { Check, Circle } from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/_layout/tasks")({
  component: Tasks,
})

const tasks = [
  { id: 1, title: "Study for 3 hours", completed: true },
  { id: 2, title: "Create task list", completed: false },
  { id: 3, title: "Clean bedroom", completed: false },
  { id: 4, title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", completed: false }
]

function Tasks() {
  return (
    <div className="mx-20 my-10">
      <div className="flex justify-center">
        <div className="flex-col shrink w-[800px] min-w-56">
          <header className="mb-4">
            <h1 className="text-3xl font-bold">
              Inbox
            </h1>
          </header>
          <main className="flex flex-col">
            {tasks.map((task) => (
              <Task key={task.id} task={task} />
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}

function Task({ task }: { task: { id: number; title: string; completed: boolean } }) {
  const [isCompleted, setIsCompleted] = useState(task.completed)
  return (
    <div className="flex gap-2 shrink-1 border-b py-3">
      <motion.button
        whileTap={{ scale: 1.2 }}
        onTap={() => setIsCompleted(!isCompleted)}
        className="flex-none self-start">
        <div className="grid grid-cols-1 grid-rows-1">
          <Circle className="h-5 w-5 row-start-1 row-end-1 col-start-1 col-end-1" />
          <div className="flex justify-center items-center row-start-1 row-end-1 col-start-1 col-end-1" >
            {isCompleted && <Check strokeWidth={4.5} className="h-3 w-3" />}
          </div>
        </div>
      </motion.button>
      <p className="text-sm line-clamp-4 text-ellipsis">{task.title}</p>
    </div>
  )
}
