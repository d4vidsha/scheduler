import { TasksService } from "@/client/services"
import Calendar from "@/components/calendar"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { TaskList } from "@/components/tasks/TaskList"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => TasksService.readTasks({ limit: 500 }),
  })

  const tasks = data?.data ?? []
  const addTaskRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcut: 'n' to focus the AddTaskForm
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return

      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        // Focus the MentionsInput inside the AddTaskForm
        const input = addTaskRef.current?.querySelector("input, textarea")
        if (input instanceof HTMLElement) input.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const isEmpty = !isLoading && tasks.length === 0

  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Left Column: Inbox */}
      <section className="w-80 bg-surface flex flex-col shrink-0">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight text-on-surface">
              Inbox
            </h2>
            <span className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {tasks.length} Tasks
            </span>
          </div>

          {/* Task input */}
          <div className="mb-6" ref={addTaskRef}>
            <AddTaskForm />
          </div>

          {/* Task list or empty state */}
          {isLoading && (
            <div className="text-sm text-on-surface-variant">Loading...</div>
          )}
          {error && (
            <div className="text-sm text-error">Error loading tasks</div>
          )}
          {isEmpty && (
            <div className="flex flex-col items-center text-center py-12 px-4">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 mb-4">
                event_available
              </span>
              <p className="text-sm font-medium text-on-surface-variant/60 mb-2">
                No tasks yet
              </p>
              <p className="text-xs text-on-surface-variant/40 leading-relaxed">
                Add a task with a due date and duration to see it on your
                calendar. Press{" "}
                <kbd className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-mono font-bold">
                  N
                </kbd>{" "}
                to start.
              </p>
            </div>
          )}
          {tasks.length > 0 && <TaskList tasks={tasks} />}

          {/* Drop zone hint */}
          {tasks.length > 0 && (
            <div className="mt-8 p-4 border border-dashed border-outline-variant/20 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-outline-variant/30 text-2xl mb-1.5">
                move_to_inbox
              </span>
              <p className="text-[10px] text-on-surface-variant/50 font-medium uppercase tracking-wider">
                Drop to unschedule
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Right Column: Calendar */}
      <section className="flex-1 bg-surface-container-low overflow-hidden">
        <Calendar tasks={tasks} />
      </section>
    </main>
  )
}
