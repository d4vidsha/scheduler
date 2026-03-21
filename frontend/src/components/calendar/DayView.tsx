import type { TaskPublic } from "@/client/models"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import {
  format,
  isSameDay,
  isToday,
  parseISO,
  setHours,
  setMinutes,
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

export default function DayView({ tasks, currentDate }: CalendarViewProps) {
  const queryClient = useQueryClient()

  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<TaskPublic | null>(null)
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  // Resize state
  const resizeRef = useRef<{
    taskId: string
    startY: number
    originalDuration: number
  } | null>(null)
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null)
  const [resizeDuration, setResizeDuration] = useState<number | null>(null)

  const activeTasks = tasks.filter((t) => !t.completed)
  const timedTasks = activeTasks.filter(
    (t) =>
      t.scheduled_start != null &&
      isSameDay(parseISO(t.scheduled_start), currentDate),
  )

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const isCurrentDay = isToday(currentDate)
  const isCurrentTimeVisible =
    isCurrentDay && currentHour >= START_HOUR && currentHour <= END_HOUR

  const hourHeight = 80

  function handleTaskDragStart(e: React.DragEvent, task: TaskPublic) {
    e.dataTransfer.setData("taskId", task.id)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleSlotDragOver(e: React.DragEvent, slotIndex: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverSlot(slotIndex)
  }

  function handleSlotDrop(e: React.DragEvent, slotIndex: number) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("taskId")
    if (!taskId) return
    setDragOverSlot(null)

    const dropHour = START_HOUR + Math.floor(slotIndex / 2)
    const dropMinute = (slotIndex % 2) * 30
    const newStart = setMinutes(setHours(currentDate, dropHour), dropMinute)

    saveTaskAndReschedule(queryClient, tasks, taskId, {
      scheduled_start: newStart.toISOString(),
    })
  }

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
      const deltaRows = Math.round(deltaY / 4)
      setResizeDuration(
        Math.max(30, resizeRef.current.originalDuration + deltaRows * 5),
      )
    }

    async function onMouseUp(ev: MouseEvent) {
      if (!resizeRef.current) return
      const deltaY = ev.clientY - resizeRef.current.startY
      const deltaRows = Math.round(deltaY / 4)
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
    setEditingTask(task)
  }

  return (
    <>
      <div className="grid grid-cols-[auto_1fr] gap-px bg-outline-variant/10 rounded-2xl overflow-hidden shadow-sm flex-1">
        {/* Header */}
        <div className="bg-surface-container-lowest p-4" />
        <div className="bg-surface-container-lowest p-4 text-center">
          <p
            className={`text-[10px] font-bold uppercase tracking-widest ${
              isCurrentDay ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            {format(currentDate, "EEEE")}
          </p>
          <p
            className={`text-3xl font-black mt-1 ${
              isCurrentDay ? "text-primary" : "text-on-surface"
            }`}
          >
            {format(currentDate, "d")}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {format(currentDate, "MMMM yyyy")}
          </p>
          {isCurrentDay && (
            <div className="mx-auto mt-1.5 w-1 h-1 bg-primary rounded-full" />
          )}
        </div>

        {/* Hour rows */}
        {HOUR_LABELS.map((hourLabel, hourIdx) => {
          const hour = START_HOUR + hourIdx
          const isCurrentHour = isCurrentTimeVisible && hour === currentHour
          const slotIdx = hourIdx * 2
          const isDragTarget =
            dragOverSlot === slotIdx || dragOverSlot === slotIdx + 1

          const cellTasks = timedTasks.filter(
            (t) => parseISO(t.scheduled_start!).getHours() === hour,
          )

          return (
            <React.Fragment key={hourLabel}>
              <div
                className={`bg-surface-container-lowest p-2 text-right text-[10px] font-mono font-bold uppercase w-16 ${
                  isCurrentHour ? "text-primary" : "text-on-surface-variant/60"
                }`}
              >
                {hourLabel}
              </div>

              <div
                className={cn(
                  "min-h-[80px] p-1 relative transition-colors",
                  isCurrentDay ? "bg-surface-container-lowest" : "bg-surface",
                  isDragTarget && "bg-primary/10",
                )}
                onDragOver={(e) => handleSlotDragOver(e, slotIdx)}
                onDrop={(e) => handleSlotDrop(e, slotIdx)}
                onDragLeave={() => setDragOverSlot(null)}
              >
                {/* Pulse indicator */}
                {isCurrentHour &&
                  (() => {
                    const frac = currentMinute / 60
                    return (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-primary/30 z-10 flex items-center"
                        style={{ top: `${frac * 100}%` }}
                      >
                        <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(0,79,168,0.5)] animate-pulse-glow -ml-1" />
                      </div>
                    )
                  })()}

                {/* Tasks */}
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
                      data-testid="calendar-task-block"
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
                          "text-xs font-bold leading-tight",
                          priorityTextClass(task.priority_id),
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        {format(startTime, "h:mma")} –{" "}
                        {effectiveDuration >= 60
                          ? `${Math.floor(effectiveDuration / 60)}h${
                              effectiveDuration % 60
                                ? ` ${effectiveDuration % 60}m`
                                : ""
                            }`
                          : `${effectiveDuration}m`}
                      </p>
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
            </React.Fragment>
          )
        })}
      </div>

      <EditDialog
        task={editingTask}
        tasks={tasks}
        onClose={() => setEditingTask(null)}
      />
    </>
  )
}
