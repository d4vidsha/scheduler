import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Check, Circle, GripVertical, Trash2 } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TasksService } from "@/client/services"
import useCustomToast from "@/hooks/useCustomToast"
import { TaskPublic } from "@/client/models"

const reorder = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

export function TaskList({ tasks }: { tasks: TaskPublic[] }) {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()
  const [orderedTasks, setOrderedTasks] = useState<TaskPublic[]>(tasks)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null)
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // update local state when tasks prop changes
  if (JSON.stringify(tasks.map(t => t.id)) !== JSON.stringify(orderedTasks.map(t => t.id))) {
    setOrderedTasks(tasks)
  }

  const reorderMutation = useMutation({
    mutationFn: (taskIds: string[]) => {
      return TasksService.reorderTasks({ requestBody: taskIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      showToast("Success", "Tasks reordered successfully", "success")
    },
    onError: () => {
      showToast("Error", "Failed to reorder tasks", "error")
      // Revert to original order on error
      setOrderedTasks(tasks)
    }
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
    const newDropPosition = e.clientY < midpoint ? 'before' : 'after'

    setDragOverTaskId(taskId)
    setDropPosition(newDropPosition)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    if (!draggedTaskId || !dragOverTaskId || draggedTaskId === dragOverTaskId || !dropPosition) {
      resetDragState()
      return
    }

    const draggedIndex = orderedTasks.findIndex(task => task.id === draggedTaskId)
    let dropIndex = orderedTasks.findIndex(task => task.id === dragOverTaskId)

    if (draggedIndex === -1 || dropIndex === -1) return

    // adjust drop index based on drop position and drag direction
    if (dropPosition === 'after') {
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
    const taskIds = newOrderedTasks.map(task => task.id)
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
        const isDraggedOver = dragOverTaskId === task.id;
        const isDragged = draggedTaskId === task.id;

        // determine border class based on drop position
        let borderClass = '';
        if (isDraggedOver && dropPosition) {
          borderClass = dropPosition === 'before' ? 'border-t-2 border-primary' : 'border-b-2 border-primary';
        }

        return (
          <div
            key={task.id}
            ref={(el) => {
              if (el) taskRefs.current.set(task.id, el);
              else taskRefs.current.delete(task.id);
            }}
            draggable
            onDragStart={() => handleDragStart(task.id)}
            onDragOver={(e) => handleDragOver(e, task.id)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`
              relative mb-1 transition-all duration-200
              ${isDragged ? 'opacity-50 scale-105 z-10' : ''}
              ${borderClass}
            `}
          >
            <TaskItem task={task} />
          </div>
        );
      })}
    </div>
  )
}

function TaskItem({ task }: { task: TaskPublic }) {
  const [isCompleted, setIsCompleted] = useState(task.completed ?? false)
  const queryClient = useQueryClient()
  const showToast = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => {
      return TasksService.deleteTask({ id: task.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      showToast("Success", "Task deleted successfully", "success")
    },
    onError: (error) => {
      showToast("Error", "Failed to delete task", "error")
      console.error("Error deleting task:", error)
    }
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
      showToast("Error", "Failed to update task status", "error")
      console.error("Error updating task status:", error)
    }
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
    <div className="flex gap-2 items-center border-b py-3 group bg-background">
      <div className="flex-none cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <motion.button
        whileTap={{ scale: 1.2 }}
        onClick={handleToggleCompleted}
        className="flex-none self-start"
        disabled={toggleCompletedMutation.status === 'pending'}
      >
        <div className="grid grid-cols-1 grid-rows-1">
          <Circle className="h-5 w-5 row-start-1 row-end-1 col-start-1 col-end-1" />
          <div className="flex justify-center items-center row-start-1 row-end-1 col-start-1 col-end-1">
            {isCompleted && <Check strokeWidth={4.5} className="h-3 w-3" />}
          </div>
        </div>
      </motion.button>
      <p className={`text-sm line-clamp-4 text-ellipsis flex-grow ${isCompleted ? 'line-through text-gray-500' : ''}`}>
        {task.title}
      </p>
      <button
        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 flex items-center justify-center"
        onClick={handleDelete}
        disabled={deleteMutation.status === 'pending'}
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>
    </div>
  )
}
