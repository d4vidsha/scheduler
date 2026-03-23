import type { TaskPublic } from "@/client/models"
import { Badge } from "@/components/ui/badge"
import { TasksService } from "@/client/services"
import EditDialog from "@/components/calendar/EditDialog"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import {
  AnimatePresence,
  Reorder,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
} from "framer-motion"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTaskGesture } from "./useTaskGesture"

function formatDueDate(due: string): { label: string; overdue: boolean } {
  const date = new Date(due)
  const overdue = isPast(date) && !isToday(date)

  let label: string
  if (isToday(date)) label = "Today"
  else if (isTomorrow(date)) label = "Tomorrow"
  else label = format(date, "MMM d")

  return { label, overdue }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function extractProject(tags: string[] | null | undefined): {
  projectName: string | null
  displayTags: string[]
} {
  if (!tags || tags.length === 0) return { projectName: null, displayTags: [] }

  const projectIdx = tags.indexOf("project")
  if (projectIdx === -1) return { projectName: null, displayTags: [...tags] }

  const hasName = projectIdx + 1 < tags.length
  const projectName = hasName ? tags[projectIdx + 1] : null
  const displayTags = tags.filter(
    (_, i) => i !== projectIdx && (!hasName || i !== projectIdx + 1),
  )
  return { projectName, displayTags }
}

function TaskMeta({
  due,
  duration,
}: {
  due: string | null | undefined
  duration: number | null | undefined
}) {
  const hasDue = !!due
  const hasDuration = duration != null && duration > 0

  if (!hasDue && !hasDuration) return null

  const dueInfo = due ? formatDueDate(due) : null

  return (
    <div
      data-testid="task-meta"
      className="flex items-center gap-1.5 shrink-0 ml-auto"
    >
      {dueInfo && (
        <span
          className={`text-[10px] flex items-center space-x-1 font-bold ${
            dueInfo.overdue ? "text-error" : "text-on-surface-variant/50"
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">
            {dueInfo.overdue ? "flag" : "event"}
          </span>
          <span>{dueInfo.label}</span>
        </span>
      )}
      {hasDuration && (
        <span className="text-[9px] text-on-surface-variant/50 font-medium">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  )
}

/** Move all selected items to be adjacent after the dragged item's position. */
function consolidateSelection(
  order: TaskPublic[],
  draggedId: string,
  selectedIds: Set<string>,
): TaskPublic[] {
  const otherSelected = order.filter(
    (t) => selectedIds.has(t.id) && t.id !== draggedId,
  )
  const withoutOtherSelected = order.filter(
    (t) => !selectedIds.has(t.id) || t.id === draggedId,
  )
  const insertIdx = withoutOtherSelected.findIndex((t) => t.id === draggedId)
  const result = [...withoutOtherSelected]
  result.splice(insertIdx + 1, 0, ...otherSelected)
  return result
}

export function TaskList({ tasks }: { tasks: TaskPublic[] }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [orderedTasks, setOrderedTasks] = useState<TaskPublic[]>(tasks)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<TaskPublic | null>(null)
  const lastClickedId = useRef<string | null>(null)
  const isDragging = useRef(false)
  const orderedRef = useRef(orderedTasks)
  orderedRef.current = orderedTasks

  useEffect(() => {
    if (!isDragging.current) {
      setOrderedTasks(tasks)
    }
  }, [tasks])

  // Escape clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIds(new Set())
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const reorderMutation = useMutation({
    mutationFn: (taskIds: string[]) => {
      return TasksService.reorderTasks({ requestBody: taskIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder tasks",
        variant: "destructive",
      })
      setOrderedTasks(tasks)
    },
  })

  const handleReorder = (newOrder: TaskPublic[]) => {
    isDragging.current = true
    setOrderedTasks(newOrder)
  }

  const handleDragEnd = useCallback(
    (draggedTaskId: string) => {
      isDragging.current = false

      let finalOrder = orderedRef.current
      if (selectedIds.size > 1 && selectedIds.has(draggedTaskId)) {
        finalOrder = consolidateSelection(
          finalOrder,
          draggedTaskId,
          selectedIds,
        )
        setOrderedTasks(finalOrder)
      }

      reorderMutation.mutate(finalOrder.map((t) => t.id))
    },
    [selectedIds, reorderMutation],
  )

  const handleTaskClick = useCallback(
    (
      taskId: string,
      e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
    ) => {
      if (e.metaKey || e.ctrlKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(taskId)) next.delete(taskId)
          else next.add(taskId)
          return next
        })
        lastClickedId.current = taskId
      } else if (e.shiftKey && lastClickedId.current) {
        const ids = orderedRef.current.map((t) => t.id)
        const start = ids.indexOf(lastClickedId.current)
        const end = ids.indexOf(taskId)
        if (start !== -1 && end !== -1) {
          const [lo, hi] = start < end ? [start, end] : [end, start]
          setSelectedIds(new Set(ids.slice(lo, hi + 1)))
        }
      } else {
        // Plain tap → open edit dialog
        const task = orderedRef.current.find((t) => t.id === taskId)
        if (task) setEditingTask(task)
      }
    },
    [],
  )

  const handleToggleSelection = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }, [])

  if (orderedTasks.length === 0) {
    return (
      <div className="text-sm text-on-surface-variant/50 text-center py-8">
        No tasks yet.
      </div>
    )
  }

  return (
    <div>
      {/* Selection bar */}
      <AnimatePresence>
        {selectedIds.size > 1 && (
          <motion.div
            key="selection-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 mb-1">
              <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Reorder.Group
        axis="y"
        values={orderedTasks}
        onReorder={handleReorder}
        className="flex flex-col"
        data-task-list-draggable
      >
        {orderedTasks.map((task, i) => {
          const sel = selectedIds.has(task.id)
          const prevSel = i > 0 && selectedIds.has(orderedTasks[i - 1].id)
          const nextSel =
            i < orderedTasks.length - 1 &&
            selectedIds.has(orderedTasks[i + 1].id)
          return (
            <TaskItem
              key={task.id}
              task={task}
              isSelected={sel}
              isFirstSelected={sel && !prevSel}
              isLastSelected={sel && !nextSel}
              onDragEnd={handleDragEnd}
              onClick={handleTaskClick}
              onToggleSelection={handleToggleSelection}
            />
          )
        })}
      </Reorder.Group>

      <EditDialog
        task={editingTask}
        tasks={orderedTasks}
        onClose={() => setEditingTask(null)}
      />
    </div>
  )
}

function TaskItem({
  task,
  isSelected,
  isFirstSelected,
  isLastSelected,
  onDragEnd,
  onClick,
  onToggleSelection,
}: {
  task: TaskPublic
  isSelected: boolean
  isFirstSelected: boolean
  isLastSelected: boolean
  onDragEnd: (taskId: string) => void
  onClick: (
    taskId: string,
    e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
  ) => void
  onToggleSelection: (taskId: string) => void
}) {
  const [isCompleted, setIsCompleted] = useState(task.completed ?? false)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const dragControls = useDragControls()

  // Swipe animation values
  const x = useMotionValue(0)
  const revealOpacity = useTransform(x, [-60, -20, 0], [1, 0.3, 0])

  const gestureCallbacks = useMemo(
    () => ({
      onTap: (e: PointerEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
          onClick(task.id, e)
        } else {
          onClick(task.id, { metaKey: false, ctrlKey: false, shiftKey: false })
        }
      },
      onDragStart: (e: PointerEvent) => {
        // Vertical drag (no long press) → reorder within task list
        dragControls.start(e)
      },
      onLongPress: (originalEvent: PointerEvent) => {
        // Long press → dispatch synthetic pointerdown for FC Draggable (calendar drop)
        const taskEl = document.querySelector(`[data-task-id="${task.id}"]`)
        if (!taskEl) return
        bypassGesture.current = true
        const synth = new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: originalEvent.clientX,
          clientY: originalEvent.clientY,
          pointerId: originalEvent.pointerId,
          pointerType: originalEvent.pointerType,
          isPrimary: true,
        })
        taskEl.dispatchEvent(synth)
      },
      onSwipeLeft: () => {
        onToggleSelection(task.id)
      },
      onSwipeRight: () => {
        // no-op placeholder
      },
      onSwipeMove: (dx: number) => {
        x.set(dx)
      },
      onSwipeEnd: () => {
        animate(x, 0, { type: "spring", stiffness: 500, damping: 30 })
      },
    }),
    [task.id, onClick, onToggleSelection, dragControls, x],
  )

  const { bypassGesture, gestureBindings } = useTaskGesture(gestureCallbacks)

  const deleteMutation = useMutation({
    mutationFn: () => {
      return TasksService.deleteTask({ id: task.id })
    },
    onSuccess: () => {
      TasksService.scheduleTasks().finally(() => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] })
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    },
  })

  const toggleCompletedMutation = useMutation({
    mutationFn: () => {
      return TasksService.toggleTaskCompleted({ id: task.id })
    },
    onSuccess: () => {
      TasksService.scheduleTasks().finally(() => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] })
      })
    },
    onError: () => {
      setIsCompleted(task.completed ?? false)
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      })
    },
  })

  const handleToggleCompleted = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsCompleted(!isCompleted)
    toggleCompletedMutation.mutate()
  }

  const selectionRounding = isSelected
    ? isFirstSelected && isLastSelected
      ? "rounded-2xl"
      : isFirstSelected
        ? "rounded-t-2xl rounded-b-none"
        : isLastSelected
          ? "rounded-b-2xl rounded-t-none"
          : "rounded-none"
    : "rounded-2xl"

  const selectionBorder = isSelected
    ? `border-[var(--ds-selection-border)] ${
        isFirstSelected && isLastSelected
          ? "border"
          : isFirstSelected
            ? "border-t border-l border-r"
            : isLastSelected
              ? "border-b border-l border-r"
              : "border-l border-r"
      }`
    : ""

  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={() => onDragEnd(task.id)}
      data-testid="task-item"
      initial={false}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 50,
        cursor: "grabbing",
      }}
      layout
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
      }}
      className="group"
    >
      <div
        className={`relative overflow-hidden transition-[border-radius] duration-200 ${selectionRounding} ${selectionBorder}`}
      >
        {/* Reveal layer (behind content) — shown on swipe left */}
        <motion.div
          className="absolute inset-0 flex items-center justify-end pr-4"
          style={{ opacity: revealOpacity }}
        >
          <span className="material-symbols-outlined text-primary text-xl">
            checklist
          </span>
        </motion.div>

        {/* Sliding content */}
        <motion.div
          style={{ x, ...gestureBindings.style }}
          className={`relative z-[1] cursor-default transition-[color,background-color,border-radius] duration-150 ${selectionRounding} ${
            isSelected
              ? "bg-[var(--ds-selection)]"
              : !isCompleted
                ? "hover:bg-black/[0.04]"
                : ""
          }`}
          onPointerDown={gestureBindings.onPointerDown}
          onPointerMove={gestureBindings.onPointerMove}
          onPointerUp={gestureBindings.onPointerUp}
          onPointerCancel={gestureBindings.onPointerCancel}
        >
          <div
            data-task-id={task.id}
            className="flex items-center space-x-3 py-0.4 px-3 min-w-0"
          >
            {/* Checkbox */}
            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={handleToggleCompleted}
              className="flex-none"
              disabled={toggleCompletedMutation.status === "pending"}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer ${
                  isCompleted
                    ? "bg-primary text-white"
                    : "border-[1.5px] border-[var(--ds-checkbox-border)] hover:border-primary/50"
                }`}
              >
                {isCompleted && (
                  <span className="material-symbols-outlined text-[12px] font-bold">
                    check
                  </span>
                )}
              </div>
            </motion.button>

            {/* Title + inline meta */}
            {(() => {
              const { projectName, displayTags } = extractProject(task.tags)
              return (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span
                      className={`text-[13px] truncate ${
                        isCompleted
                          ? "line-through text-on-surface-variant/40"
                          : "text-on-surface/90"
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="material-symbols-outlined text-[12px] ml-1.5 text-on-surface-variant/30">
                        description
                      </span>
                    )}
                    {displayTags.length > 0 &&
                      displayTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="bg-on-surface-variant/[0.08] text-[9px] px-1.5 py-0.5 text-on-surface-variant/70 font-medium ml-1.5 border-on-surface-variant/[0.08]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    <TaskMeta due={task.due} duration={task.duration} />
                  </div>
                  {projectName && (
                    <p className="text-[10px] text-on-surface-variant/40 -mt-0.5 leading-tight">
                      {projectName}
                    </p>
                  )}
                </div>
              )
            })()}

            <button
              type="button"
              className={`transition-opacity p-0.5 hover:bg-error/10 rounded-full ${
                isCompleted ? "invisible" : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={(e) => {
                e.stopPropagation()
                if (confirm("Are you sure you want to delete this task?")) {
                  deleteMutation.mutate()
                }
              }}
              disabled={isCompleted || deleteMutation.status === "pending"}
              aria-label="Delete task"
            >
              <span className="material-symbols-outlined text-on-surface-variant/30 text-sm">
                close
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </Reorder.Item>
  )
}
