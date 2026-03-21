import type { TaskPublic } from "@/client/models"
import { cn } from "@/lib/utils"
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { useState } from "react"
import EditDialog from "./EditDialog"
import { type CalendarViewProps, priorityDotClass } from "./shared"

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MAX_VISIBLE_TASKS = 3

export default function MonthView({
  tasks,
  currentDate,
  onNavigate,
}: CalendarViewProps) {
  const [editingTask, setEditingTask] = useState<TaskPublic | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  // Fill calendar grid from start-of-week of month start to end-of-week of month end
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  const activeTasks = tasks.filter((t) => !t.completed)

  function getTasksForDay(day: Date): TaskPublic[] {
    return activeTasks.filter((t) => {
      if (t.scheduled_start && isSameDay(parseISO(t.scheduled_start), day))
        return true
      if (!t.scheduled_start && t.due && isSameDay(parseISO(t.due), day))
        return true
      return false
    })
  }

  return (
    <>
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden shadow-sm bg-outline-variant/10">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAY_HEADERS.map((day) => (
            <div
              key={day}
              className="bg-surface-container-lowest p-3 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px flex-1">
          {calendarDays.map((day) => {
            const inCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            const dayTasks = getTasksForDay(day)
            const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS)
            const overflowCount = dayTasks.length - MAX_VISIBLE_TASKS

            let cellBg = "bg-surface"
            if (isCurrentDay) cellBg = "bg-surface-container-lowest"
            else if (!inCurrentMonth) cellBg = "bg-surface-container"
            else if (isWeekend) cellBg = "bg-surface-container-low"

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[100px] p-2 flex flex-col transition-colors cursor-pointer hover:bg-surface-container-high/50",
                  cellBg,
                )}
                onClick={() => onNavigate(day)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onNavigate(day)
                }}
                role="button"
                tabIndex={0}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isCurrentDay && "text-primary",
                      !isCurrentDay && inCurrentMonth && "text-on-surface",
                      !inCurrentMonth && "text-on-surface-variant/40",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {isCurrentDay && (
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </div>

                {/* Task chips */}
                <div className="flex flex-col gap-0.5 flex-1">
                  {visibleTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium truncate rounded px-1.5 py-0.5 text-left",
                        "hover:bg-surface-container-highest/60 transition-colors",
                        inCurrentMonth
                          ? "text-on-surface"
                          : "text-on-surface-variant/50",
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingTask(task)
                      }}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          priorityDotClass(task.priority_id),
                        )}
                      />
                      <span className="truncate">{task.title}</span>
                    </button>
                  ))}
                  {overflowCount > 0 && (
                    <span className="text-[9px] text-on-surface-variant/50 font-semibold px-1.5">
                      +{overflowCount} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <EditDialog
        task={editingTask}
        tasks={tasks}
        onClose={() => setEditingTask(null)}
      />
    </>
  )
}
