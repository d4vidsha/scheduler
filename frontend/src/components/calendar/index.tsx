import type { TaskPublic } from "@/client/models"
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfWeek,
  format,
  getWeek,
  startOfToday,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import { useState } from "react"
import { useCalendarView } from "./CalendarViewContext"
import FullCalendarView from "./FullCalendarView"
import YearView from "./YearView"

interface CalendarProps {
  tasks?: TaskPublic[]
}

const VIEW_TO_FC = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
} as const

export default function Calendar({ tasks = [] }: CalendarProps) {
  const today = startOfToday()
  const { view, setView } = useCalendarView()
  const [currentDate, setCurrentDate] = useState(today)

  function goToToday() {
    setCurrentDate(today)
  }

  function goPrevious() {
    switch (view) {
      case "day":
        setCurrentDate(subDays(currentDate, 1))
        break
      case "week":
        setCurrentDate(subWeeks(currentDate, 1))
        break
      case "month":
        setCurrentDate(subMonths(currentDate, 1))
        break
      case "year":
        setCurrentDate(subYears(currentDate, 1))
        break
    }
  }

  function goNext() {
    switch (view) {
      case "day":
        setCurrentDate(addDays(currentDate, 1))
        break
      case "week":
        setCurrentDate(addWeeks(currentDate, 1))
        break
      case "month":
        setCurrentDate(addMonths(currentDate, 1))
        break
      case "year":
        setCurrentDate(addYears(currentDate, 1))
        break
    }
  }

  // Navigate to a specific date (used by year view to drill down)
  function handleNavigate(date: Date) {
    setCurrentDate(date)
    if (view === "year") setView("month")
    else if (view === "month") setView("day")
  }

  // Header title varies by view
  function getTitle(): string {
    switch (view) {
      case "day":
        return format(currentDate, "EEEE, MMMM d")
      case "week": {
        const ws = startOfWeek(currentDate)
        const we = endOfWeek(currentDate)
        return `${format(ws, "MMMM d")} – ${format(we, "d")}`
      }
      case "month":
        return format(currentDate, "MMMM yyyy")
      case "year":
        return format(currentDate, "yyyy")
    }
  }

  function getSubtitle(): string {
    switch (view) {
      case "day":
        return format(currentDate, "yyyy")
      case "week":
        return `Week ${getWeek(currentDate)} • ${format(currentDate, "yyyy")}`
      case "month":
        return ""
      case "year":
        return ""
    }
  }

  return (
    <div className="flex h-full flex-col p-8">
      {/* Calendar header — date title + nav arrows only */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-on-surface">
            {getTitle()}
          </h2>
          {getSubtitle() && (
            <p className="text-on-surface-variant text-sm font-medium mt-1">
              {getSubtitle()}
            </p>
          )}
        </div>

        <div className="flex bg-surface-container rounded-lg p-1">
          <button
            type="button"
            onClick={goPrevious}
            className="p-1.5 hover:bg-surface-container-high rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="px-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goNext}
            className="p-1.5 hover:bg-surface-container-high rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* View content */}
      {view === "year" ? (
        <div data-testid="calendar-year-view">
          <YearView
            tasks={tasks}
            currentDate={currentDate}
            onNavigate={handleNavigate}
          />
        </div>
      ) : (
        <div
          data-testid={`calendar-${view}-view`}
          className="flex-1 min-h-0"
        >
          <FullCalendarView
            tasks={tasks}
            currentDate={currentDate}
            view={VIEW_TO_FC[view]}
          />
        </div>
      )}
    </div>
  )
}
