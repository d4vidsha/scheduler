import { createFileRoute } from "@tanstack/react-router"
import { Circle } from "lucide-react"

export const Route = createFileRoute("/_layout/tasks")({
  component: Tasks,
})

const tasks = [
  "Study for 3 hours",
  "Create task list",
  "Clean bedroom"
]

function Tasks() {
  return (
    <div className="flex justify-center mx-20 my-10">
      <div className="flex-col flex-initial w-[800px]">
        <header className="mb-4">
          <h1 className="text-3xl font-bold">
            Inbox
          </h1>
        </header>
        <main className="flex flex-col">
          {tasks.map((task) => (
            <div className="flex border-b py-1">
              <Circle className="h-4 w-4 self-center mr-2" />
              <div className="flex py-2">
                <p>{task}</p>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
