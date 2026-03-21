import type { TaskPublic } from "@/client/models"
import { TasksService } from "@/client/services"
import type { QueryClient } from "@tanstack/react-query"

// --- Priority styling ---

export const PRIORITY_BORDER: Record<number, string> = {
  1: "border-l-red-500",
  2: "border-l-orange-500",
  3: "border-l-blue-500",
  4: "border-l-gray-400",
}

export const PRIORITY_BG: Record<number, string> = {
  1: "bg-red-50",
  2: "bg-orange-50",
  3: "bg-primary/5",
  4: "bg-slate-50",
}

export const PRIORITY_TEXT: Record<number, string> = {
  1: "text-red-700",
  2: "text-orange-700",
  3: "text-primary",
  4: "text-slate-600",
}

export const PRIORITY_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-blue-500",
  4: "bg-gray-400",
}

export function priorityBorderClass(priorityId?: number | null): string {
  return priorityId != null
    ? PRIORITY_BORDER[priorityId] ?? "border-l-primary"
    : "border-l-primary"
}

export function priorityBgClass(priorityId?: number | null): string {
  return priorityId != null
    ? PRIORITY_BG[priorityId] ?? "bg-primary/5"
    : "bg-primary/5"
}

export function priorityTextClass(priorityId?: number | null): string {
  return priorityId != null
    ? PRIORITY_TEXT[priorityId] ?? "text-primary"
    : "text-primary"
}

export function priorityDotClass(priorityId?: number | null): string {
  return priorityId != null
    ? PRIORITY_DOT[priorityId] ?? "bg-gray-400"
    : "bg-gray-400"
}

// --- Common types ---

export type CalendarView = "day" | "week" | "month" | "year"

export interface CalendarViewProps {
  tasks: TaskPublic[]
  currentDate: Date
  onNavigate: (date: Date) => void
}

// --- Shared helpers ---

export async function saveTaskAndReschedule(
  queryClient: QueryClient,
  tasks: TaskPublic[],
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

export const START_HOUR = 9
export const END_HOUR = 17

export const HOUR_LABELS = [
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
