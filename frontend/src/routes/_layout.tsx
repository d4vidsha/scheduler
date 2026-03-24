import { TasksService } from "@/client/services"
import { useQueryClient } from "@tanstack/react-query"
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { format } from "date-fns"
import { useState } from "react"

import { Spinner } from "@/components/Common/Spinner"
import {
  CalendarViewProvider,
  useCalendarView,
} from "@/components/calendar/CalendarViewContext"
import type { CalendarView } from "@/components/calendar/shared"
import Sidebar from "@/components/sidebar"
import { useTheme } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import UserMenu from "@/components/user-menu"
import { useToast } from "@/hooks/use-toast"
import useAuth, { isLoggedIn } from "../hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

const VIEW_TABS: { key: CalendarView; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
]

function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 hover:bg-surface-container rounded-full transition-colors"
      aria-label="Toggle dark mode"
    >
      <span className="material-symbols-outlined text-xl">
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  )
}

function ViewTabs() {
  const { view, setView } = useCalendarView()
  return (
    <nav className="flex space-x-6 text-sm">
      {VIEW_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setView(tab.key)}
          className={`font-medium transition-colors pb-1 ${
            view === tab.key
              ? "text-primary font-semibold border-b-2 border-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

function LayoutInner() {
  const { isLoading } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isScheduling, setIsScheduling] = useState(false)

  async function handleAutoSchedule() {
    setIsScheduling(true)
    try {
      await TasksService.scheduleTasks({
        requestBody: {
          client_now: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        },
      })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast({ title: "Done", description: "Tasks rescheduled successfully" })
    } catch {
      toast({
        title: "Error",
        description: "Failed to reschedule tasks",
        variant: "destructive",
      })
    } finally {
      setIsScheduling(false)
    }
  }

  return (
    <>
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-8 h-16 sticky top-0 bg-surface dark:bg-surface/80 dark:backdrop-blur-md dark:border-b dark:border-outline-variant/20 z-40 transition-colors duration-200">
          <div className="flex items-center space-x-8">
            <span className="text-xl font-bold text-on-surface tracking-tight">
              Scheduler
            </span>
            <ViewTabs />
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleAutoSchedule}
              disabled={isScheduling}
              className="bg-surface-container hover:bg-surface-container-high text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all active:opacity-80 disabled:opacity-50"
            >
              {isScheduling ? (
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  Scheduling...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">
                    auto_awesome
                  </span>
                  Auto-Schedule
                </span>
              )}
            </button>
            <div className="flex items-center space-x-2 text-on-surface-variant">
              <DarkModeToggle />
              <button
                type="button"
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  notifications
                </span>
              </button>
              <button
                type="button"
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  settings
                </span>
              </button>
            </div>
            <UserMenu />
          </div>
        </header>

        {/* Main Content */}
        {isLoading ? (
          <div className="flex justify-center items-center flex-1 w-full">
            <Spinner size="large" />
          </div>
        ) : (
          <Outlet />
        )}
      </div>
      <Toaster />
    </>
  )
}

function Layout() {
  return (
    <CalendarViewProvider>
      <LayoutInner />
    </CalendarViewProvider>
  )
}
