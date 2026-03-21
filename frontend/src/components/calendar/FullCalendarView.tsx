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
import { format, isToday, parseISO, startOfDay } from "date-fns"
import { useCallback, useEffect, useRef, useState } from "react"
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
  const isCompleted = task.completed ?? false

  const classNames = [getPriorityClass(task.priority_id)]
  if (isCompleted) {
    classNames.push("fc-event-done")
    // Non-today events get completed styling immediately (no trail animation)
    if (!isToday(startOfDay(start))) {
      classNames.push("fc-event-completed")
    }
  }

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
    classNames,
    editable: !isCompleted,
  }
}

export default function FullCalendarView({
  tasks,
  currentDate,
  view,
  onDateChange,
}: FullCalendarViewProps) {
  const queryClient = useQueryClient()
  const calendarContainerRef = useRef<HTMLDivElement>(null)
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

  // Build events from all scheduled tasks (including completed)
  const events: EventInput[] = tasks
    .filter((t) => t.scheduled_start != null)
    .map(taskToEvent)
    .filter((e) => e.id != null)

  // Add conflict detection via classNames (only between active tasks)
  const activeEventIds = new Set(
    tasks.filter((t) => !t.completed).map((t) => t.id),
  )
  const eventsWithConflicts = events.map((event) => {
    if (!activeEventIds.has(event.id as string)) return event

    const start = event.start instanceof Date ? event.start.getTime() : 0
    const end = event.end instanceof Date ? event.end.getTime() : 0

    const hasConflict = events.some((other) => {
      if (other.id === event.id) return false
      if (!activeEventIds.has(other.id as string)) return false
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

  // Achievement trail: connect consecutive completed events in the same column.
  // Tracks which connections already exist so only new ones animate.
  const trailTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const connectedPairs = useRef<Set<string>>(new Set())
  const styledEvents = useRef<Set<string>>(new Set())

  const drawTrails = useCallback((skipToday = false) => {
    const container = calendarContainerRef.current
    if (!container) return

    // Clear pending timers
    if (!skipToday) {
      for (const t of trailTimers.current) clearTimeout(t)
      trailTimers.current = []
    }

    // Remove existing trail DOM elements (will be redrawn)
    // When skipToday, only clear non-today columns
    if (skipToday) {
      container.querySelectorAll(".fc-timegrid-col:not(.fc-day-today)").forEach((col) => {
        col.querySelectorAll(".achievement-trail-dot, .achievement-trail-dot-static, .achievement-trail-line")
          .forEach((el) => el.remove())
      })
    } else {
      container
        .querySelectorAll(".achievement-trail-dot, .achievement-trail-dot-static, .achievement-trail-line")
        .forEach((el) => el.remove())
    }

    // Non-timegrid: style all done events immediately
    const cols = container.querySelectorAll(".fc-timegrid-col")
    if (cols.length === 0) {
      container.querySelectorAll(".fc-event-done").forEach((el) => {
        el.classList.add("fc-event-completed")
      })
      return
    }

    const nextConnected = new Set<string>()
    const nextStyled = new Set<string>()

    for (const col of cols) {
      const isToday = col.classList.contains("fc-day-today")

      // When skipToday, only process non-today columns (instant static trails)
      if (skipToday && isToday) continue

      // Get ALL events in the column, sorted by position
      const allEventEls = Array.from(col.querySelectorAll(".fc-event"))
      if (allEventEls.length === 0) continue

      const colRect = col.getBoundingClientRect()
      const allEvents = allEventEls
        .map((el) => {
          const rect = el.getBoundingClientRect()
          const wrapper = el.closest("[data-event-id]") as HTMLElement | null
          return {
            el: el as HTMLElement,
            id: wrapper?.dataset.eventId ?? "",
            done: el.classList.contains("fc-event-done"),
            top: rect.top - colRect.top,
            bottom: rect.bottom - colRect.top,
            centerX: rect.left + rect.width / 2 - colRect.left,
          }
        })
        .sort((a, b) => a.top - b.top)

      // Build a single chain of consecutive completed events starting from
      // the first event of the day. The trail represents the user's progress
      // through the day, so it can only grow from the top. If the first event
      // isn't completed, no trail is shown. The chain breaks at the first
      // incomplete event.
      const chain: typeof allEvents = []
      for (const ev of allEvents) {
        if (ev.done) {
          chain.push(ev)
        } else {
          break
        }
      }
      const chains = chain.length > 0 ? [chain] : []

      const colFrame = col.querySelector(".fc-timegrid-col-frame")
      if (!colFrame) continue

      for (const chain of chains) {
        // Single completed event — style it, no trail
        if (chain.length === 1) {
          chain[0].el.classList.add("fc-event-completed")
          nextStyled.add(chain[0].id)
          continue
        }

        // First in chain: always styled
        chain[0].el.classList.add("fc-event-completed")
        nextStyled.add(chain[0].id)

        let cumulativeNewDelay = 0

        for (let i = 0; i < chain.length - 1; i++) {
          const from = chain[i]
          const to = chain[i + 1]
        const lineTop = from.bottom
        const lineHeight = to.top - from.bottom
        const pairKey = `${from.id}→${to.id}`
        nextConnected.add(pairKey)

        const alreadyConnected = !isToday || connectedPairs.current.has(pairKey)
        const isAdjacent = lineHeight <= 0

        if (alreadyConnected) {
          // Already connected or non-today — style instantly
          to.el.classList.add("fc-event-completed")
          nextStyled.add(to.id)

          if (!isAdjacent) {
            const dot = document.createElement("div")
            dot.className = "achievement-trail-dot-static"
            dot.style.cssText = `
              position: absolute;
              left: ${from.centerX - 3}px;
              top: ${from.bottom - 3}px;
              width: 6px;
              height: 6px;
              background: var(--ds-primary);
              border-radius: 50%;
              z-index: 5;
              pointer-events: none;
            `
            colFrame.appendChild(dot)

            const isDashed = lineHeight > 5
            const line = document.createElement("div")
            line.className = "achievement-trail-line"
            line.style.cssText = `
              position: absolute;
              left: ${from.centerX - 1}px;
              top: ${lineTop}px;
              width: 2px;
              height: ${lineHeight}px;
              z-index: 4;
              pointer-events: none;
              clip-path: none;
              animation: none;
              ${
                isDashed
                  ? `background-image: linear-gradient(to bottom, var(--ds-primary) 33%, transparent 0%);
                     background-size: 2px 8px;
                     background-repeat: repeat-y;
                     opacity: 0.4;`
                  : `background: linear-gradient(180deg, color-mix(in srgb, var(--ds-primary) 40%, transparent) 0%, color-mix(in srgb, var(--ds-primary) 5%, transparent) 100%);`
              }
            `
            colFrame.appendChild(line)
          }
        } else if (isAdjacent) {
          // Adjacent on today — no line, but cascade with a small delay
          const adjacentDelay = 0.25
          const revealMs = (cumulativeNewDelay + adjacentDelay) * 1000
          const targetEl = to.el
          const targetId = to.id
          nextStyled.add(targetId)
          trailTimers.current.push(
            setTimeout(() => {
              targetEl.classList.add("fc-event-completed")
            }, revealMs),
          )
          cumulativeNewDelay += adjacentDelay
        } else {
          // New connection with gap — animate line
          const drawDuration = Math.max(0.3, Math.min(lineHeight / 120, 0.8))

          const dot = document.createElement("div")
          dot.className = "achievement-trail-dot"
          dot.style.cssText = `
            position: absolute;
            left: ${from.centerX - 3}px;
            top: ${from.bottom - 3}px;
            width: 6px;
            height: 6px;
            background: var(--ds-primary);
            border-radius: 50%;
            z-index: 5;
            pointer-events: none;
            animation-delay: ${cumulativeNewDelay}s;
          `
          colFrame.appendChild(dot)

          const isDashed = lineHeight > 5
          const line = document.createElement("div")
          line.className = "achievement-trail-line"
          const lineDelay = cumulativeNewDelay + 0.1
          line.style.cssText = `
            position: absolute;
            left: ${from.centerX - 1}px;
            top: ${lineTop}px;
            width: 2px;
            height: ${lineHeight}px;
            z-index: 4;
            pointer-events: none;
            animation-duration: ${drawDuration}s;
            animation-delay: ${lineDelay}s;
            animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
            ${
              isDashed
                ? `background-image: linear-gradient(to bottom, var(--ds-primary) 33%, transparent 0%);
                   background-size: 2px 8px;
                   background-repeat: repeat-y;
                   opacity: 0.4;`
                : `background: linear-gradient(180deg, color-mix(in srgb, var(--ds-primary) 40%, transparent) 0%, color-mix(in srgb, var(--ds-primary) 5%, transparent) 100%);`
            }
          `
          colFrame.appendChild(line)

          // Reveal target event when line arrives
          const revealMs = (lineDelay + drawDuration) * 1000
          const targetEl = to.el
          const targetId = to.id
          nextStyled.add(targetId)
          trailTimers.current.push(
            setTimeout(() => {
              targetEl.classList.add("fc-event-completed")
            }, revealMs),
          )

          cumulativeNewDelay = lineDelay + drawDuration
        }
      }
      } // end chain loop
    }

    if (skipToday) {
      // Merge non-today results without touching today's state
      for (const k of nextConnected) connectedPairs.current.add(k)
      for (const k of nextStyled) styledEvents.current.add(k)
    } else {
      connectedPairs.current = nextConnected
      styledEvents.current = nextStyled
    }
  }, [])

  // Draw trails after calendar renders.
  // Run immediately for non-today static trails only (skipToday=true),
  // then again after a short delay for today's animated trails.
  useEffect(() => {
    drawTrails(true)
    const timer = setTimeout(() => drawTrails(), 100)
    return () => {
      clearTimeout(timer)
      for (const t of trailTimers.current) clearTimeout(t)
    }
  }, [view, eventsWithConflicts, drawTrails])

  // Reset trail state when view/date changes (calendar remounts)
  const prevKey = useRef("")
  const calendarKey = `${view}-${currentDate.toISOString()}`
  if (calendarKey !== prevKey.current) {
    prevKey.current = calendarKey
    connectedPairs.current.clear()
    styledEvents.current.clear()
  }

  return (
    <>
      <div
        ref={calendarContainerRef}
        className="flex-1 h-full"
        data-testid={`calendar-${view}`}
      >
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
          eventDidMount={(info) => {
            info.el.setAttribute("data-event-id", info.event.id)
          }}
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
            const isCompleted = task?.completed ?? false

            if (isTimeGrid) {
              return (
                <div className="overflow-hidden h-full flex items-start space-x-1.5">
                  {isCompleted && (
                    <div className="w-3 h-3 rounded-full bg-primary flex-none flex items-center justify-center mt-px">
                      <span className="material-symbols-outlined text-[10px] font-black text-white">
                        check
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-[10px] font-bold leading-tight ${
                        isCompleted ? "line-through" : ""
                      }`}
                    >
                      {arg.event.title}
                    </p>
                    {!isCompleted && duration > 30 && (
                      <p className="text-[9px] opacity-60 mt-1">
                        {arg.timeText}
                      </p>
                    )}
                  </div>
                </div>
              )
            }

            // Month/DayGrid
            return (
              <div className="truncate flex items-center space-x-1">
                {isCompleted && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary flex-none flex items-center justify-center">
                    <span className="material-symbols-outlined text-[8px] font-black text-white">
                      check
                    </span>
                  </div>
                )}
                <span
                  className={`text-[10px] font-bold truncate ${
                    isCompleted ? "line-through" : ""
                  }`}
                >
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
