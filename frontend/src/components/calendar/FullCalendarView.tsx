import type { TaskPublic } from "@/client/models"
import type {
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin, {
  type Draggable as DraggableType,
  Draggable,
} from "@fullcalendar/interaction"
import type { EventResizeDoneArg } from "@fullcalendar/interaction"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import { useQueryClient } from "@tanstack/react-query"
import { format, isToday, parseISO } from "date-fns"
import { useEffect, useRef, useState } from "react"
import EditDialog from "./EditDialog"
import "./fullcalendar-overrides.css"
import { saveTask } from "./shared"

type FCView = "timeGridDay" | "timeGridWeek" | "dayGridMonth"

interface FullCalendarViewProps {
  tasks: TaskPublic[]
  currentDate: Date
  view: FCView
  onDateChange?: (date: Date) => void
}

function getPriorityClass(priorityId?: number | null): string {
  if (priorityId == null) return "fc-event-priority-default"
  return `fc-event-priority-${priorityId}`
}

function taskToEvent(task: TaskPublic): EventInput {
  if (!task.scheduled_start) return {}

  const start = parseISO(task.scheduled_start)
  const durationMs = (task.duration ?? 30) * 60 * 1000
  const end = new Date(start.getTime() + durationMs)

  return {
    id: task.id,
    title: task.title ?? undefined,
    start,
    end,
    extendedProps: {
      task,
      priorityId: task.priority_id,
      duration: task.duration ?? 30,
    },
    classNames: [getPriorityClass(task.priority_id)],
    editable: true,
  }
}

export default function FullCalendarView({
  tasks,
  currentDate,
  view,
  onDateChange,
}: FullCalendarViewProps) {
  const queryClient = useQueryClient()
  const draggableRef = useRef<DraggableType | null>(null)
  const [editingTask, setEditingTask] = useState<TaskPublic | null>(null)

  // Set up external drag from task list
  useEffect(() => {
    const el = document.querySelector("[data-task-list-draggable]")
    if (!el) return

    draggableRef.current = new Draggable(el as HTMLElement, {
      itemSelector: "[draggable=true][data-task-id]",
      eventData: (eventEl) => {
        const taskId = eventEl.getAttribute("data-task-id")
        const task = tasks.find((t) => t.id === taskId)
        if (!task) return {}
        return {
          id: task.id,
          title: task.title,
          duration: {
            minutes: task.duration ?? 30,
          },
          extendedProps: { task, priorityId: task.priority_id },
          classNames: [getPriorityClass(task.priority_id)],
          create: false,
        }
      },
    })

    return () => {
      draggableRef.current?.destroy()
      draggableRef.current = null
    }
  }, [tasks])

  // Build events from tasks
  const activeTasks = tasks.filter((t) => !t.completed)
  const events: EventInput[] = activeTasks
    .filter((t) => t.scheduled_start != null)
    .map(taskToEvent)
    .filter((e) => e.id != null)

  // Add conflict detection via classNames
  const eventsWithConflicts = events.map((event) => {
    const start = event.start instanceof Date ? event.start.getTime() : 0
    const end = event.end instanceof Date ? event.end.getTime() : 0

    const hasConflict = events.some((other) => {
      if (other.id === event.id) return false
      const otherStart = other.start instanceof Date ? other.start.getTime() : 0
      const otherEnd = other.end instanceof Date ? other.end.getTime() : 0
      return start < otherEnd && end > otherStart
    })

    if (hasConflict) {
      return {
        ...event,
        classNames: [...(event.classNames as string[]), "fc-event-conflict"],
      }
    }
    return event
  })

  function handleEventClick(info: EventClickArg) {
    const task = info.event.extendedProps.task as TaskPublic | undefined
    if (task) {
      setEditingTask(task)
    }
  }

  async function handleEventDrop(info: EventDropArg) {
    const taskId = info.event.id
    const newStart = info.event.start
    if (!newStart) return

    await saveTask(queryClient, tasks, taskId, {
      scheduled_start: format(newStart, "yyyy-MM-dd'T'HH:mm:ss"),
    })
  }

  async function handleEventResize(info: EventResizeDoneArg) {
    const taskId = info.event.id
    const start = info.event.start
    const end = info.event.end
    if (!start || !end) return

    const newDuration = Math.round((end.getTime() - start.getTime()) / 60000)
    await saveTask(queryClient, tasks, taskId, {
      duration: Math.max(15, newDuration),
    })
  }

  async function handleExternalDrop(info: {
    date: Date
    draggedEl: HTMLElement
    allDay: boolean
  }) {
    const taskId = info.draggedEl.getAttribute("data-task-id")
    if (!taskId) return

    await saveTask(queryClient, tasks, taskId, {
      scheduled_start: format(info.date, "yyyy-MM-dd'T'HH:mm:ss"),
    })
  }

  // Use key to force remount when view or date changes, avoiding flushSync errors
  const calendarKey = `${view}-${currentDate.toISOString()}`

  return (
    <>
      <div className="flex-1 h-full" data-testid={`calendar-${view}`}>
        <FullCalendar
          key={calendarKey}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView={view}
          initialDate={currentDate}
          headerToolbar={false}
          events={eventsWithConflicts}
          editable
          droppable
          selectable={false}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          drop={handleExternalDrop}
          slotMinTime="09:00:00"
          slotMaxTime="18:00:00"
          scrollTime="09:00:00"
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          allDaySlot={false}
          nowIndicator
          dayMaxEvents={3}
          height="100%"
          expandRows
          dayHeaderContent={(arg) => {
            const date = arg.date
            const isCurrent = isToday(date)
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            return (
              <div className="text-center py-1">
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    isCurrent ? "text-primary" : "text-on-surface-variant"
                  }`}
                >
                  {format(date, "EEE")}
                </p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    isCurrent
                      ? "text-primary"
                      : isWeekend
                        ? "text-on-surface-variant"
                        : "text-on-surface"
                  }`}
                >
                  {format(date, "d")}
                </p>
                {isCurrent && (
                  <div className="mx-auto mt-1 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
            )
          }}
          eventContent={(arg) => {
            const task = arg.event.extendedProps.task as TaskPublic | undefined
            const isTimeGrid = arg.view.type.startsWith("timeGrid")
            const duration = task?.duration ?? 30

            if (isTimeGrid) {
              return (
                <div className="overflow-hidden h-full">
                  <p className="text-[10px] font-bold leading-tight">
                    {arg.event.title}
                  </p>
                  {duration > 30 && (
                    <p className="text-[9px] opacity-60 mt-1">{arg.timeText}</p>
                  )}
                </div>
              )
            }

            // Month/DayGrid — just the title
            return (
              <div className="truncate">
                <span className="text-[10px] font-bold truncate">
                  {arg.event.title}
                </span>
              </div>
            )
          }}
          datesSet={(dateInfo) => {
            if (onDateChange) {
              onDateChange(dateInfo.start)
            }
          }}
        />
      </div>

      <EditDialog
        task={editingTask}
        tasks={tasks}
        onClose={() => setEditingTask(null)}
      />
    </>
  )
}
