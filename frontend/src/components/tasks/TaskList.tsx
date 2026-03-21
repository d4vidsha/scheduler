import type { TaskPublic } from "@/client/models"
import { TasksService } from "@/client/services"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"

const TAG_COLORS: Record<string, string> = {
  finance: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  design:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  sales: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ops: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  dev: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  marketing: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
}

function getTagColor(tag: string): string {
  return (
    TAG_COLORS[tag.toLowerCase()] ??
    "bg-surface-container text-on-surface-variant"
  )
}

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

function TaskMeta({
  tags,
  due,
  duration,
}: {
  tags: string[] | null | undefined
  due: string | null | undefined
  duration: number | null | undefined
}) {
  const hasTags = tags && tags.length > 0
  const hasDue = !!due
  const hasDuration = duration != null && duration > 0

  if (!hasTags && !hasDue && !hasDuration) return null

  const dueInfo = due ? formatDueDate(due) : null

  return (
    <div data-testid="task-meta" className="flex items-center gap-2 mt-1">
      {hasTags &&
        tags.map((tag) => (
          <span
            key={tag}
            className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider ${getTagColor(
              tag,
            )}`}
          >
            {tag}
          </span>
        ))}
      {dueInfo && (
        <span
          className={`text-[10px] flex items-center ${
            dueInfo.overdue ? "text-error" : "text-on-surface-variant/60"
          }`}
        >
          <span className="material-symbols-outlined text-[12px] mr-1">
            event
          </span>
          {dueInfo.label}
        </span>
      )}
      {hasDuration && (
        <span className="text-[10px] text-on-surface-variant/60 flex items-center">
          <span className="material-symbols-outlined text-[12px] mr-1">
            schedule
          </span>
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
        finalOrder = consolidateSelection(finalOrder, draggedTaskId, selectedIds)
        setOrderedTasks(finalOrder)
      }

      reorderMutation.mutate(finalOrder.map((t) => t.id))
    },
    [selectedIds, reorderMutation],
  )

  const handleTaskClick = useCallback(
    (taskId: string, e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(taskId)) next.delete(taskId)
          else next.add(taskId)
          return next
        })
      } else if (e.shiftKey && lastClickedId.current) {
        const ids = orderedRef.current.map((t) => t.id)
        const start = ids.indexOf(lastClickedId.current)
        const end = ids.indexOf(taskId)
        if (start !== -1 && end !== -1) {
          const [lo, hi] = start < end ? [start, end] : [end, start]
          setSelectedIds(new Set(ids.slice(lo, hi + 1)))
        }
      } else {
        setSelectedIds((prev) =>
          prev.size === 1 && prev.has(taskId) ? new Set() : new Set([taskId]),
        )
      }
      lastClickedId.current = taskId
    },
    [],
  )

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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -4 }}
              animate={{ y: 0 }}
              className="flex items-center justify-between px-2.5 py-1.5 mb-1 rounded-lg"
              style={{ backgroundColor: "color-mix(in srgb, var(--ds-primary) 8%, transparent)" }}
            >
              <span className="text-xs font-medium text-primary">
                {selectedIds.size} tasks selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Clear
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Reorder.Group
        axis="y"
        values={orderedTasks}
        onReorder={handleReorder}
        className="space-y-0.5"
        data-task-list-draggable
      >
        {orderedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isSelected={selectedIds.has(task.id)}
            onDragEnd={handleDragEnd}
            onClick={handleTaskClick}
          />
        ))}
      </Reorder.Group>
    </div>
  )
}

function TaskItem({
  task,
  isSelected,
  onDragEnd,
  onClick,
}: {
  task: TaskPublic
  isSelected: boolean
  onDragEnd: (taskId: string) => void
  onClick: (taskId: string, e: React.MouseEvent) => void
}) {
  const [isCompleted, setIsCompleted] = useState(task.completed ?? false)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const dragControls = useDragControls()

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

  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={() => onDragEnd(task.id)}
      onClick={(e) => onClick(task.id, e)}
      data-testid="task-item"
      data-task-id={task.id}
      initial={false}
      animate={{
        backgroundColor: isSelected
          ? "color-mix(in srgb, var(--ds-primary) 10%, transparent)"
          : "rgba(0,0,0,0)",
        borderColor: isSelected
          ? "color-mix(in srgb, var(--ds-primary) 25%, transparent)"
          : "rgba(0,0,0,0)",
      }}
      whileHover={
        !isSelected && !isCompleted
          ? { backgroundColor: "color-mix(in srgb, var(--ds-on-surface) 5%, transparent)" }
          : undefined
      }
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 50,
        cursor: "grabbing",
      }}
      layout
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        backgroundColor: { duration: 0.15 },
        borderColor: { duration: 0.15 },
      }}
      className="group flex space-x-2.5 py-2.5 px-2.5 rounded-lg cursor-default items-start border border-transparent"
      style={{ position: "relative" }}
    >
      {/* Selection indicator bar */}
      <motion.div
        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
        initial={false}
        animate={{
          scaleY: isSelected ? 1 : 0,
          backgroundColor: "var(--ds-primary)",
          opacity: isSelected ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ originY: 0.5 }}
      />

      {/* Checkbox */}
      <motion.button
        whileTap={{ scale: 1.2 }}
        onClick={handleToggleCompleted}
        className="flex-none mt-0.5"
        disabled={toggleCompletedMutation.status === "pending"}
      >
        <div
          className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer ${
            isCompleted
              ? "bg-primary text-white"
              : "border-[1.5px] border-outline-variant/40 hover:border-primary/50"
          }`}
        >
          {isCompleted && (
            <span className="material-symbols-outlined text-[12px] font-bold">
              check
            </span>
          )}
        </div>
      </motion.button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isCompleted
              ? "line-through decoration-primary/30 decoration-2 text-on-surface-variant/50"
              : "text-on-surface"
          }`}
        >
          {task.title}
        </p>
        <TaskMeta tags={task.tags} due={task.due} duration={task.duration} />
      </div>

      {!isCompleted && (
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-error/10 rounded"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm("Are you sure you want to delete this task?")) {
              deleteMutation.mutate()
            }
          }}
          disabled={deleteMutation.status === "pending"}
          aria-label="Delete task"
        >
          <span className="material-symbols-outlined text-error/60 text-base">
            close
          </span>
        </button>
      )}

      {/* Drag handle */}
      <motion.span
        className="material-symbols-outlined text-outline-variant/40 text-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={(e) => dragControls.start(e)}
        onClick={(e) => e.stopPropagation()}
        whileHover={{ scale: 1.1, color: "var(--ds-on-surface-variant)" }}
        whileTap={{ scale: 0.95 }}
      >
        drag_indicator
      </motion.span>
    </Reorder.Item>
  )
}
