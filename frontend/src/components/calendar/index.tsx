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
import DayView from "./DayView"
import MonthView from "./MonthView"
import WeekView from "./WeekView"
import YearView from "./YearView"
import type { CalendarView } from "./shared"

interface CalendarProps {
  tasks?: TaskPublic[]
}

export default function Calendar({ tasks = [] }: CalendarProps) {
  const today = startOfToday()
  const [view, setView] = useState<CalendarView>("week")
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

  // Navigate to a specific date (used by month/year views to drill down)
  function handleNavigate(date: Date) {
    setCurrentDate(date)
    // Drill down: year→month, month→day
    if (view === "year") setView("month")
    else if (view === "month") setView("day")
  }

  // Header title varies by view
  function getTitle(): string {
    switch (view) {
      case "day":
        return format(currentDate, "EEEE, MMMM d")
      case "week": {
        const weekStart = startOfWeek(currentDate)
        const weekEnd = endOfWeek(currentDate)
        return `${format(weekStart, "MMMM d")} – ${format(weekEnd, "d")}`
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

  const viewButtons: { key: CalendarView; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
  ]

  return (
    <div className="flex h-full flex-col p-8">
      {/* Calendar header */}
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

        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex bg-surface-container rounded-lg p-0.5">
            {viewButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setView(btn.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  view === btn.key
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Navigation */}
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
      </div>

      {/* View content */}
      {view === "day" && (
        <DayView
          tasks={tasks}
          currentDate={currentDate}
          onNavigate={handleNavigate}
        />
      )}
      {view === "week" && (
        <WeekView
          tasks={tasks}
          currentDate={currentDate}
          onNavigate={handleNavigate}
        />
      )}
      {view === "month" && (
        <MonthView
          tasks={tasks}
          currentDate={currentDate}
          onNavigate={handleNavigate}
        />
      )}
      {view === "year" && (
        <YearView
          tasks={tasks}
          currentDate={currentDate}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  )
}
