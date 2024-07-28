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
              <div key={task.id.toString()} className="flex shrink-1 border-b py-3">
                <button className="self-start">
                  <Circle className="flex-none h-5 w-5 mr-2 transition-colors hover:bg-accent rounded-full" />
                </button>
                <p className="text-sm line-clamp-4 text-ellipsis">{task.title}</p>
              </div>
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}
