import type { TaskPublic } from "@/client/models"
import { TasksService } from "@/client/services"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import { motion } from "framer-motion"
import { CalendarDays, Check, Circle, GripVertical, Trash2 } from "lucide-react"
import { useRef, useState } from "react"

const PRIORITY_COLORS: Record<number, string> = {
  1: "text-red-500",
  2: "text-orange-400",
  3: "text-blue-400",
  4: "text-gray-300",
}

function PriorityDot({ priorityId }: { priorityId: number | null | undefined }) {
  if (!priorityId) return null
  const color = PRIORITY_COLORS[priorityId] ?? "text-gray-300"
  return (
    <span data-testid="priority-dot" className={`flex-none mt-0.5 ${color}`}>
      <svg
        viewBox="0 0 8 8"
        className="h-2 w-2 fill-current"
        aria-hidden="true"
      >
        <circle cx="4" cy="4" r="4" />
      </svg>
    </span>
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
    <div data-testid="task-meta" className="flex items-center gap-1.5 flex-wrap mt-0.5 pl-0">
      {hasTags &&
        tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs px-1.5 py-0 rounded-full font-normal h-4"
          >
            {tag}
          </Badge>
        ))}
      {dueInfo && (
        <span
          className={`flex items-center gap-0.5 text-xs ${
            dueInfo.overdue ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          <CalendarDays className="h-3 w-3" />
          {dueInfo.label}
        </span>
      )}
      {hasDuration && (
        <span className="text-xs text-muted-foreground">
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

  // update local state when tasks prop changes
  if (
    JSON.stringify(tasks.map((t) => t.id)) !==
    JSON.stringify(orderedTasks.map((t) => t.id))
  ) {
    setOrderedTasks(tasks)
  }

  const reorderMutation = useMutation({
    mutationFn: (taskIds: string[]) => {
      return TasksService.reorderTasks({ requestBody: taskIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast({
        title: "Success",
        description: "Tasks reordered successfully",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder tasks",
        variant: "destructive",
      })
      // Revert to original order on error
      setOrderedTasks(tasks)
    },
  })

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId)
  }

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    if (draggedTaskId === taskId) return

    // get the task element being dragged over
    const taskElement = taskRefs.current.get(taskId)
    if (!taskElement) return

    // calculate position within the element
    const rect = taskElement.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2

    // if cursor is above midpoint, drop before; otherwise, drop after
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

    // adjust drop index based on drop position and drag direction
    if (dropPosition === "after") {
      dropIndex += 1
    }

    // if we're moving an item down, we need to account for the item being removed first
    if (draggedIndex < dropIndex) {
      dropIndex -= 1
    }

    // reorder tasks locally
    const newOrderedTasks = reorder(orderedTasks, draggedIndex, dropIndex)
    setOrderedTasks(newOrderedTasks)

    // send new order to backend
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
    return <div>No tasks yet.</div>
  }

  return (
    <div className="space-y-1">
      {orderedTasks.map((task) => {
        const isDraggedOver = dragOverTaskId === task.id
        const isDragged = draggedTaskId === task.id

        // determine border class based on drop position
        let borderClass = ""
        if (isDraggedOver && dropPosition) {
          borderClass =
            dropPosition === "before"
              ? "border-t-2 border-primary"
              : "border-b-2 border-primary"
        }

        return (
          <div
            key={task.id}
            ref={(el) => {
              if (el) taskRefs.current.set(task.id, el)
              else taskRefs.current.delete(task.id)
            }}
            draggable
            onDragStart={() => handleDragStart(task.id)}
            onDragOver={(e) => handleDragOver(e, task.id)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`
              relative mb-1 transition-all duration-200
              ${isDragged ? "opacity-50 scale-105 z-10" : ""}
              ${borderClass}
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
      console.error("Error deleting task:", error)
    },
  })

  const toggleCompletedMutation = useMutation({
    mutationFn: () => {
      return TasksService.toggleTaskCompleted({ id: task.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (error) => {
      // revert the local state if the API call fails
      setIsCompleted(task.completed ?? false)
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      })
      console.error("Error updating task status:", error)
    },
  })

  const handleToggleCompleted = (e: React.MouseEvent) => {
    e.stopPropagation()
    // optimistically update the UI
    setIsCompleted(!isCompleted)
    // then make the API call
    toggleCompletedMutation.mutate()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate()
    }
  }

  return (
    <div
      data-testid="task-item"
      className="flex gap-2 items-start border-b py-3 group bg-background"
    >
      <div className="flex-none cursor-grab active:cursor-grabbing pt-0.5">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <motion.button
        whileTap={{ scale: 1.2 }}
        onClick={handleToggleCompleted}
        className="flex-none pt-0.5"
        disabled={toggleCompletedMutation.status === "pending"}
      >
        <div className="grid grid-cols-1 grid-rows-1">
          <Circle className="h-5 w-5 row-start-1 row-end-1 col-start-1 col-end-1" />
          <div className="flex justify-center items-center row-start-1 row-end-1 col-start-1 col-end-1">
            {isCompleted && <Check strokeWidth={4.5} className="h-3 w-3" />}
          </div>
        </div>
      </motion.button>
      <div className="flex-grow min-w-0">
        <div className="flex items-start gap-1.5">
          <PriorityDot priorityId={task.priority_id} />
          <p
            className={`text-sm flex-grow ${
              isCompleted ? "line-through text-gray-500" : ""
            }`}
          >
            {task.title}
          </p>
        </div>
        <TaskMeta tags={task.tags} due={task.due} duration={task.duration} />
      </div>
      <button
        type="button"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 flex items-center justify-center flex-none"
        onClick={handleDelete}
        disabled={deleteMutation.status === "pending"}
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>
    </div>
  )
}
