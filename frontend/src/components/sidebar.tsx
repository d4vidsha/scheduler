import { Link, useRouterState } from "@tanstack/react-router"
import { useState } from "react"
import { AddTaskForm } from "./tasks/AddTaskForm"
import { Dialog, DialogContent } from "./ui/dialog"

const navigation = [
  { icon: "today", title: "Today", path: "/" },
  { icon: "calendar_month", title: "Upcoming", path: "/" },
  { icon: "folder_open", title: "Projects", path: "/" },
  { icon: "history_edu", title: "Logbook", path: "/" },
]

export default function Sidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [addTaskOpen, setAddTaskOpen] = useState(false)

  return (
    <>
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-transparent dark:border-outline-variant/20 flex flex-col p-6 space-y-8 z-50">
        {/* Brand */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="1" y="1" width="16" height="4" rx="1.5" fill="white" />
              <rect
                x="1"
                y="7"
                width="11"
                height="4"
                rx="1.5"
                fill="white"
                opacity="0.7"
              />
              <rect
                x="1"
                y="13"
                width="14"
                height="4"
                rx="1.5"
                fill="white"
                opacity="0.4"
              />
            </svg>
          </div>
          <h1 className="text-lg font-black tracking-tighter text-on-surface">
            Scheduler
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPath === item.path && item.title === "Today"

            return (
              <Link
                key={item.title}
                to={item.path}
                className={`
                  rounded-xl px-3 py-2.5 flex items-center space-x-3
                  transition-all duration-200 hover:translate-x-1 cursor-pointer active:scale-95
                  ${
                    isActive
                      ? "bg-surface-container-lowest text-primary-container font-semibold shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }
                `}
              >
                <span className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                <span
                  className={`text-sm ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.title}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Add New Task CTA */}
        <button
          type="button"
          onClick={() => setAddTaskOpen(true)}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-white rounded-xl py-3 px-4 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          <span className="text-sm">Add New Task</span>
        </button>
      </aside>

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="sm:max-w-lg bg-surface-container-lowest/80 backdrop-blur-[20px]">
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-tight text-on-surface">
              New Task
            </h3>
            <AddTaskForm onSuccess={() => setAddTaskOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
