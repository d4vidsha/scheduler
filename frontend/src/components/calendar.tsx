import type { TaskPublic } from "@/client/models"
import { TasksService } from "@/client/services"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getWeek,
  isSameDay,
  isToday,
  parse,
  parseISO,
  setHours,
  setMinutes,
  startOfToday,
  startOfWeek,
} from "date-fns"
import React, { useRef, useState } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

const PRIORITY_BORDER: Record<number, string> = {
  1: "border-l-red-500",
  2: "border-l-orange-500",
  3: "border-l-blue-500",
  4: "border-l-gray-400",
}

const PRIORITY_BG: Record<number, string> = {
  1: "bg-red-50",
  2: "bg-orange-50",
  3: "bg-primary/5",
  4: "bg-slate-50",
}

const PRIORITY_TEXT: Record<number, string> = {
  1: "text-red-700",
  2: "text-orange-700",
  3: "text-primary",
  4: "text-slate-600",
}

function priorityBorderClass(priorityId?: number | null): string {
  return priorityId != null
    ? PRIORITY_BORDER[priorityId] ?? "border-l-primary"
    : "border-l-primary"
}

function priorityBgClass(priorityId?: number | null): string {
  return priorityId != null
    ? PRIORITY_BG[priorityId] ?? "bg-primary/5"
    : "bg-primary/5"
}

function priorityTextClass(priorityId?: number | null): string {
  return priorityId != null
    ? PRIORITY_TEXT[priorityId] ?? "text-primary"
    : "text-primary"
}

const HOURS = [
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
]
const START_HOUR = 9
const END_HOUR = 17

interface WeekCalendarProps {
  tasks?: TaskPublic[]
}

export default function WeekCalendar({ tasks = [] }: WeekCalendarProps) {
  const queryClient = useQueryClient()

  const today = startOfToday()
  const [currentWeek, setCurrentWeek] = useState(format(today, "yyyy-MM-dd"))
  const firstDayCurrentWeek = parse(currentWeek, "yyyy-MM-dd", new Date())
  const weekStart = startOfWeek(firstDayCurrentWeek)
  const daysOfWeek = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(firstDayCurrentWeek),
  })

  // Drag state
  const [dragOverSlot, setDragOverSlot] = useState<{
    dayIndex: number
    slotIndex: number
  } | null>(null)

  // Resize state
  const resizeRef = useRef<{
    taskId: string
    startY: number
    originalDuration: number
  } | null>(null)
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null)
  const [resizeDuration, setResizeDuration] = useState<number | null>(null)

  // Edit dialog state
  const [editingTask, setEditingTask] = useState<TaskPublic | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDuration, setEditDuration] = useState(30)
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  const activeTasks = tasks.filter((t) => !t.completed)
  const timedTasks = activeTasks.filter((t) => t.scheduled_start != null)

  // Current time position for the pulse indicator
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const isCurrentTimeVisible =
    currentHour >= START_HOUR && currentHour <= END_HOUR
  // Week date range for display
  const weekEndDate = daysOfWeek[6]
  const weekNumber = getWeek(firstDayCurrentWeek)

  function previousWeek() {
    setCurrentWeek(format(addWeeks(firstDayCurrentWeek, -1), "yyyy-MM-dd"))
  }
  function nextWeek() {
    setCurrentWeek(format(addWeeks(firstDayCurrentWeek, 1), "yyyy-MM-dd"))
  }
  function thisWeek() {
    setCurrentWeek(format(today, "yyyy-MM-dd"))
  }

  async function saveTaskAndReschedule(
    taskId: string,
    updates: Partial<TaskPublic>,
  ) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    await TasksService.updateTask({
      id: taskId,
      requestBody: { ...task, ...updates, owner_id: task.owner_id },
    })
    await TasksService.scheduleTasks()
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
  }

  // Drag handlers
  function handleTaskDragStart(e: React.DragEvent, task: TaskPublic) {
    e.dataTransfer.setData("taskId", task.id)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleSlotDragOver(
    e: React.DragEvent,
    dayIndex: number,
    slotIndex: number,
  ) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverSlot({ dayIndex, slotIndex })
  }

  function handleSlotDrop(
    e: React.DragEvent,
    dayIndex: number,
    slotIndex: number,
  ) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("taskId")
    if (!taskId) return
    setDragOverSlot(null)

    const dropDay = addDays(weekStart, dayIndex)
    const dropHour = START_HOUR + Math.floor(slotIndex / 2)
    const dropMinute = (slotIndex % 2) * 30
    const newStart = setMinutes(setHours(dropDay, dropHour), dropMinute)

    saveTaskAndReschedule(taskId, { scheduled_start: newStart.toISOString() })
  }

  function handleSlotDragLeave() {
    setDragOverSlot(null)
  }

  // Resize handlers
  function handleResizeStart(e: React.MouseEvent, task: TaskPublic) {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = {
      taskId: task.id,
      startY: e.clientY,
      originalDuration: task.duration ?? 30,
    }
    setResizingTaskId(task.id)
    setResizeDuration(task.duration ?? 30)

    function onMouseMove(ev: MouseEvent) {
      if (!resizeRef.current) return
      const deltaY = ev.clientY - resizeRef.current.startY
      const rowHeightPx = 4
      const deltaRows = Math.round(deltaY / rowHeightPx)
      const newDuration = Math.max(
        30,
        resizeRef.current.originalDuration + deltaRows * 5,
      )
      setResizeDuration(newDuration)
    }

    async function onMouseUp(ev: MouseEvent) {
      if (!resizeRef.current) return
      const deltaY = ev.clientY - resizeRef.current.startY
      const rowHeightPx = 4
      const deltaRows = Math.round(deltaY / rowHeightPx)
      const newDuration = Math.max(
        30,
        resizeRef.current.originalDuration + deltaRows * 5,
      )
      const taskId = resizeRef.current.taskId

      resizeRef.current = null
      setResizingTaskId(null)
      setResizeDuration(null)

      if (deltaRows !== 0) {
        await saveTaskAndReschedule(taskId, { duration: newDuration })
      }

      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  // Edit dialog handlers
  function handleTaskMouseDown(e: React.MouseEvent) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }

  function handleTaskClick(e: React.MouseEvent, task: TaskPublic) {
    if (!mouseDownPos.current) return
    const dx = Math.abs(e.clientX - mouseDownPos.current.x)
    const dy = Math.abs(e.clientY - mouseDownPos.current.y)
    mouseDownPos.current = null
    if (dx > 5 || dy > 5) return
    setEditingTask(task)
    setEditTitle(task.title ?? "")
    setEditDuration(task.duration ?? 30)
  }

  async function handleEditSave() {
    if (!editingTask) return
    await saveTaskAndReschedule(editingTask.id, {
      title: editTitle,
      duration: editDuration,
    })
    setEditingTask(null)
  }

  // Calculate row heights: each hour = 80px
  const hourHeight = 80

  return (
    <div className="flex h-full flex-col p-8">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-on-surface">
            {format(weekStart, "MMMM d")} – {format(weekEndDate, "d")}
          </h2>
          <p className="text-on-surface-variant text-sm font-medium mt-1">
            Week {weekNumber} • {format(firstDayCurrentWeek, "yyyy")}
          </p>
        </div>
        <div className="flex bg-surface-container rounded-lg p-1">
          <button
            type="button"
            onClick={previousWeek}
            className="p-1.5 hover:bg-surface-container-high rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={thisWeek}
            className="px-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextWeek}
            className="p-1.5 hover:bg-surface-container-high rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-8 gap-px bg-outline-variant/10 rounded-2xl overflow-hidden shadow-sm flex-1">
        {/* Header row: corner + 7 day headers */}
        <div className="bg-surface-container-lowest p-4" />
        {daysOfWeek.map((day) => {
          const isCurrentDay = isToday(day)
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          return (
            <div
              key={day.toString()}
              className="bg-surface-container-lowest p-4 text-center"
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  isCurrentDay ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {format(day, "EEE")}
              </p>
              <p
                className={`text-xl font-bold mt-1 ${
                  isCurrentDay
                    ? "text-primary"
                    : isWeekend
                      ? "text-on-surface-variant"
                      : "text-on-surface"
                }`}
              >
                {format(day, "d")}
              </p>
              {isCurrentDay && (
                <div className="mx-auto mt-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </div>
          )
        })}

        {/* Time slots grid */}
        {HOURS.map((hourLabel, hourIdx) => {
          const hour = START_HOUR + hourIdx
          const isCurrentHour = isCurrentTimeVisible && hour === currentHour

          return (
            <React.Fragment key={hourLabel}>
              {/* Hour label */}
              <div
                className={`bg-surface-container-lowest p-2 text-right text-[10px] font-mono font-bold uppercase ${
                  isCurrentHour ? "text-primary" : "text-on-surface-variant/60"
                }`}
              >
                {hourLabel}
              </div>

              {/* Day cells for this hour */}
              {daysOfWeek.map((day, dayIdx) => {
                const isCurrentDay = isToday(day)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6

                // Background tonal layering
                let cellBg = "bg-surface"
                if (isCurrentDay) cellBg = "bg-surface-container-lowest"
                else if (isWeekend) cellBg = "bg-surface-container-low"

                // Drag highlight
                const slotIdx = hourIdx * 2
                const isDragTarget =
                  (dragOverSlot?.dayIndex === dayIdx &&
                    dragOverSlot?.slotIndex === slotIdx) ||
                  (dragOverSlot?.dayIndex === dayIdx &&
                    dragOverSlot?.slotIndex === slotIdx + 1)

                // Find timed tasks in this hour+day
                const cellTasks = timedTasks.filter((t) => {
                  const start = parseISO(t.scheduled_start!)
                  return isSameDay(start, day) && start.getHours() === hour
                })

                return (
                  <div
                    key={`${hourLabel}-${dayIdx}`}
                    className={cn(
                      "min-h-[80px] p-1 relative transition-colors",
                      cellBg,
                      isDragTarget && "bg-primary/10",
                    )}
                    onDragOver={(e) => handleSlotDragOver(e, dayIdx, slotIdx)}
                    onDrop={(e) => handleSlotDrop(e, dayIdx, slotIdx)}
                    onDragLeave={handleSlotDragLeave}
                  >
                    {/* Pulse indicator - current time line */}
                    {isCurrentDay &&
                      isCurrentHour &&
                      (() => {
                        const minuteFraction = currentMinute / 60
                        return (
                          <div
                            className="absolute left-0 right-0 h-0.5 bg-primary/30 z-10 flex items-center"
                            style={{ top: `${minuteFraction * 100}%` }}
                          >
                            <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(0,79,168,0.5)] animate-pulse-glow -ml-1" />
                          </div>
                        )
                      })()}

                    {/* Task blocks */}
                    {cellTasks.map((task) => {
                      const startTime = parseISO(task.scheduled_start!)
                      const effectiveDuration =
                        resizingTaskId === task.id && resizeDuration != null
                          ? resizeDuration
                          : task.duration ?? 30
                      const minuteOffset = startTime.getMinutes()
                      const topPercent = (minuteOffset / 60) * 100
                      const heightPx = (effectiveDuration / 60) * hourHeight

                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "absolute left-1 right-1 rounded-md border-l-4 p-2 cursor-pointer select-none z-20 overflow-hidden",
                            priorityBorderClass(task.priority_id),
                            priorityBgClass(task.priority_id),
                          )}
                          style={{
                            top: `${topPercent}%`,
                            height: `${heightPx}px`,
                            minHeight: "24px",
                          }}
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, task)}
                          onMouseDown={handleTaskMouseDown}
                          onMouseUp={(e) => handleTaskClick(e, task)}
                        >
                          <p
                            className={cn(
                              "text-[10px] font-bold leading-tight",
                              priorityTextClass(task.priority_id),
                            )}
                          >
                            {task.title}
                          </p>
                          {effectiveDuration > 30 && (
                            <p className="text-[9px] text-on-surface-variant mt-0.5">
                              {format(startTime, "h:mma")}
                            </p>
                          )}
                          {/* Resize handle */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize bg-transparent hover:bg-black/5 rounded-b"
                            onMouseDown={(e) => handleResizeStart(e, task)}
                          />
                        </div>
                      )
                    })}

                    {/* Drag target hover cue */}
                    {isDragTarget && cellTasks.length === 0 && (
                      <div className="absolute inset-1 border-2 border-dashed border-primary/20 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary/40">
                          add_circle
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          )
        })}
      </div>

      {/* Edit task dialog */}
      <Dialog
        open={editingTask != null}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null)
        }}
      >
        <DialogContent className="bg-surface-container-lowest/80 backdrop-blur-[20px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave()
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-duration">Duration (minutes)</Label>
              <Input
                id="edit-duration"
                type="number"
                min={15}
                step={15}
                value={editDuration}
                onChange={(e) => setEditDuration(Number(e.target.value))}
              />
            </div>
            <Button
              onClick={handleEditSave}
              className="w-full bg-gradient-to-r from-primary to-primary-container text-white hover:opacity-90"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
