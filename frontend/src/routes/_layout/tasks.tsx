import { createFileRoute } from "@tanstack/react-router"
import { Circle } from "lucide-react"

export const Route = createFileRoute("/_layout/tasks")({
  component: Tasks,
})

const tasks = [
  { id: 1, title: "Study for 3 hours" },
  { id: 2, title: "Create task list" },
  { id: 3, title: "Clean bedroom" },
  { id: 4, title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." }
]

function Tasks() {
  return (
    <div className="flex justify-center mx-20 my-10">
      <div className="w-[800px]">
        <header className="mb-4">
          <h1 className="text-3xl font-bold">
            Inbox
          </h1>
        </header>
        <main className="flex flex-col">
          {tasks.map((task) => (
            <div key={task.id.toString()} className="flex border-b py-1">
              <Circle className="flex-none h-4 w-4 self-start mr-2 mt-3" />
              <div className="flex py-2">
                <p>{task.title}</p>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
