import type { TaskPublic } from "@/client/models"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfWeek,
} from "date-fns"
import React, { useRef, useState } from "react"
import EditDialog from "./EditDialog"
import {
  type CalendarViewProps,
  END_HOUR,
  HOUR_LABELS,
  START_HOUR,
  priorityBgClass,
  priorityBorderClass,
  priorityTextClass,
  saveTaskAndReschedule,
} from "./shared"

export default function WeekView({ tasks, currentDate }: CalendarViewProps) {
  const queryClient = useQueryClient()

  const weekStart = startOfWeek(currentDate)
  const daysOfWeek = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate),
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

  // Click vs drag tracking
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  const activeTasks = tasks.filter((t) => !t.completed)
  const timedTasks = activeTasks.filter((t) => t.scheduled_start != null)

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const isCurrentTimeVisible =
    currentHour >= START_HOUR && currentHour <= END_HOUR

  const hourHeight = 80

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

    saveTaskAndReschedule(queryClient, tasks, taskId, {
      scheduled_start: newStart.toISOString(),
    })
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
      const id = resizeRef.current.taskId

      resizeRef.current = null
      setResizingTaskId(null)
      setResizeDuration(null)

      if (deltaRows !== 0) {
        await saveTaskAndReschedule(queryClient, tasks, id, {
          duration: newDuration,
        })
      }

      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  function handleTaskMouseDown(e: React.MouseEvent) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }

  function handleTaskClick(e: React.MouseEvent, task: TaskPublic) {
    if (!mouseDownPos.current) return
    const dx = Math.abs(e.clientX - mouseDownPos.current.x)
    const dy = Math.abs(e.clientY - mouseDownPos.current.y)
    mouseDownPos.current = null
    if (dx > 5 || dy > 5) return
    setEditingTaskId(task.id)
  }

  return (
    <>
      <div className="grid grid-cols-8 gap-px bg-outline-variant/10 rounded-2xl overflow-hidden shadow-sm flex-1">
        {/* Header row */}
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

        {/* Hour rows */}
        {HOUR_LABELS.map((hourLabel, hourIdx) => {
          const hour = START_HOUR + hourIdx
          const isCurrentHour = isCurrentTimeVisible && hour === currentHour

          return (
            <React.Fragment key={hourLabel}>
              <div
                className={`bg-surface-container-lowest p-2 text-right text-[10px] font-mono font-bold uppercase ${
                  isCurrentHour ? "text-primary" : "text-on-surface-variant/60"
                }`}
              >
                {hourLabel}
              </div>

              {daysOfWeek.map((day, dayIdx) => {
                const isCurrentDay = isToday(day)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6

                let cellBg = "bg-surface"
                if (isCurrentDay) cellBg = "bg-surface-container-lowest"
                else if (isWeekend) cellBg = "bg-surface-container-low"

                const slotIdx = hourIdx * 2
                const isDragTarget =
                  (dragOverSlot?.dayIndex === dayIdx &&
                    dragOverSlot?.slotIndex === slotIdx) ||
                  (dragOverSlot?.dayIndex === dayIdx &&
                    dragOverSlot?.slotIndex === slotIdx + 1)

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
                    {/* Pulse indicator */}
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

                      // Conflict detection: check if this task overlaps with another
                      const taskEnd =
                        startTime.getTime() + effectiveDuration * 60000
                      const hasConflict = timedTasks.some((other) => {
                        if (other.id === task.id) return false
                        const otherStart = parseISO(
                          other.scheduled_start!,
                        ).getTime()
                        const otherEnd =
                          otherStart + (other.duration ?? 30) * 60000
                        return (
                          startTime.getTime() < otherEnd && taskEnd > otherStart
                        )
                      })

                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "absolute left-1 right-1 rounded-md border-l-4 p-2 cursor-pointer select-none z-20 overflow-hidden",
                            priorityBorderClass(task.priority_id),
                            priorityBgClass(task.priority_id),
                            hasConflict && "ring-2 ring-red-400/60 ring-inset",
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
                          {hasConflict && (
                            <p className="text-[8px] text-red-500 font-semibold mt-0.5">
                              Conflict
                            </p>
                          )}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize bg-transparent hover:bg-black/5 rounded-b"
                            onMouseDown={(e) => handleResizeStart(e, task)}
                          />
                        </div>
                      )
                    })}

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

      <EditDialog
        task={
          editingTaskId
            ? tasks.find((t) => t.id === editingTaskId) ?? null
            : null
        }
        tasks={tasks}
        onClose={() => setEditingTaskId(null)}
      />
    </>
  )
}
