import { cn } from "@/lib/utils"
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  parseISO,
  startOfMonth,
} from "date-fns"
import type { CalendarViewProps } from "./shared"

const MONTHS = Array.from({ length: 12 }, (_, i) => i)

export default function YearView({
  tasks,
  currentDate,
  onNavigate,
}: CalendarViewProps) {
  const year = currentDate.getFullYear()
  const activeTasks = tasks.filter((t) => !t.completed)

  // Build a map of date string → task count
  const taskCountByDate = new Map<string, number>()
  for (const task of activeTasks) {
    const dateStr = task.scheduled_start
      ? format(parseISO(task.scheduled_start), "yyyy-MM-dd")
      : task.due
        ? format(parseISO(task.due), "yyyy-MM-dd")
        : null
    if (dateStr) {
      taskCountByDate.set(dateStr, (taskCountByDate.get(dateStr) ?? 0) + 1)
    }
  }

  function getHeatColor(count: number): string {
    if (count === 0) return "bg-surface-container"
    if (count === 1) return "bg-primary/15"
    if (count === 2) return "bg-primary/30"
    if (count === 3) return "bg-primary/50"
    return "bg-primary/70"
  }

  return (
    <div className="flex-1 grid grid-cols-3 gap-6 overflow-y-auto">
      {MONTHS.map((monthIdx) => {
        const monthDate = new Date(year, monthIdx, 1)
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

        // Leading empty cells for first week alignment
        const startDayOfWeek = getDay(monthStart)

        return (
          <div key={monthIdx} className="flex flex-col">
            {/* Month header */}
            <button
              type="button"
              className="text-sm font-bold text-on-surface mb-2 text-left hover:text-primary transition-colors"
              onClick={() => onNavigate(monthDate)}
            >
              {format(monthDate, "MMMM")}
            </button>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span
                  key={`${d}-${i}`}
                  className="text-[8px] text-on-surface-variant/50 text-center font-bold"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Empty leading cells */}
              {Array.from({ length: startDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd")
                const count = taskCountByDate.get(dateStr) ?? 0
                const isCurrentDay = isToday(day)

                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={cn(
                      "aspect-square rounded-sm transition-colors relative",
                      getHeatColor(count),
                      isCurrentDay && "ring-1 ring-primary",
                      "hover:ring-1 hover:ring-primary/40",
                    )}
                    onClick={() => onNavigate(day)}
                    title={`${format(day, "MMM d")}: ${count} task${
                      count !== 1 ? "s" : ""
                    }`}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div className="col-span-3 flex items-center justify-center gap-3 py-4">
        <span className="text-[10px] text-on-surface-variant font-medium">
          Less
        </span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn("w-3 h-3 rounded-sm", getHeatColor(level))}
          />
        ))}
        <span className="text-[10px] text-on-surface-variant font-medium">
          More
        </span>
      </div>
    </div>
  )
}
