import type { TaskPublic } from "@/client/models"
import { TasksService } from "@/client/services"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import { motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

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

const reorder = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

export function TaskList({ tasks }: { tasks: TaskPublic[] }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [orderedTasks, setOrderedTasks] = useState<TaskPublic[]>(tasks)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(
    null,
  )
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    setOrderedTasks(tasks)
  }, [tasks])

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

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
    e.dataTransfer.effectAllowed = "move"
    setDraggedTaskId(taskId)
  }

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    if (draggedTaskId === taskId) return

    const taskElement = taskRefs.current.get(taskId)
    if (!taskElement) return

    const rect = taskElement.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const newDropPosition = e.clientY < midpoint ? "before" : "after"

    setDragOverTaskId(taskId)
    setDropPosition(newDropPosition)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    if (
      !draggedTaskId ||
      !dragOverTaskId ||
      draggedTaskId === dragOverTaskId ||
      !dropPosition
    ) {
      resetDragState()
      return
    }

    const draggedIndex = orderedTasks.findIndex(
      (task) => task.id === draggedTaskId,
    )
    let dropIndex = orderedTasks.findIndex((task) => task.id === dragOverTaskId)

    if (draggedIndex === -1 || dropIndex === -1) return

    if (dropPosition === "after") {
      dropIndex += 1
    }
    if (draggedIndex < dropIndex) {
      dropIndex -= 1
    }

    const newOrderedTasks = reorder(orderedTasks, draggedIndex, dropIndex)
    setOrderedTasks(newOrderedTasks)

    const taskIds = newOrderedTasks.map((task) => task.id)
    reorderMutation.mutate(taskIds)

    resetDragState()
  }

  const resetDragState = () => {
    setDraggedTaskId(null)
    setDragOverTaskId(null)
    setDropPosition(null)
  }

  const handleDragEnd = () => {
    resetDragState()
  }

  if (orderedTasks.length === 0) {
    return (
      <div className="text-sm text-on-surface-variant/50 text-center py-8">
        No tasks yet.
      </div>
    )
  }

  return (
    <div className="space-y-0.5" data-task-list-draggable>
      {orderedTasks.map((task) => {
        const isDragged = draggedTaskId === task.id
        const isDraggedOver = dragOverTaskId === task.id

        let highlightClass = ""
        if (isDraggedOver && dropPosition) {
          highlightClass =
            dropPosition === "before"
              ? "ring-t-2 ring-primary"
              : "ring-b-2 ring-primary"
        }

        return (
          <div
            key={task.id}
            ref={(el) => {
              if (el) taskRefs.current.set(task.id, el)
              else taskRefs.current.delete(task.id)
            }}
            draggable
            data-task-id={task.id}
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragOver={(e) => handleDragOver(e, task.id)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`
              transition-all duration-200
              ${isDragged ? "opacity-50 scale-105 z-10" : ""}
              ${highlightClass}
            `}
          >
            <TaskItem task={task} />
          </div>
        )
      })}
    </div>
  )
}

function TaskItem({ task }: { task: TaskPublic }) {
  const [isCompleted, setIsCompleted] = useState(task.completed ?? false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

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
    <div
      data-testid="task-item"
      className={`group flex space-x-2.5 py-2.5 px-2.5 rounded-lg cursor-default transition-all items-start ${
        isCompleted
          ? ""
          : "hover:bg-surface-container-highest/50"
      }`}
    >
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
        <>
          {/* Delete button */}
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

          {/* Drag handle */}
          <span className="material-symbols-outlined text-outline-variant/40 text-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
            drag_indicator
          </span>
        </>
      )}
    </div>
  )
}
