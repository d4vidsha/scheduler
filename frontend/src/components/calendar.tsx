import { type TaskPublic } from "@/client/models"
import { TasksService } from "@/client/services"
import { cn } from "@/lib/utils"
import {
  addDays,
  addWeeks,
  differenceInDays,
  differenceInMinutes,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parse,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfToday,
  startOfWeek,
} from "date-fns"
import { ChevronDown, ChevronLeft, ChevronRight, Ellipsis } from "lucide-react"
import React, { type ReactNode, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

const PRIORITY_BORDER: Record<number, string> = {
  1: "border-l-red-500",
  2: "border-l-orange-500",
  3: "border-l-blue-500",
  4: "border-l-gray-400",
}

const PRIORITY_CHIP: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-orange-100 text-orange-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-gray-100 text-gray-600",
}

const PRIORITY_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-blue-500",
  4: "bg-gray-400",
}

function priorityBorderClass(priorityId?: number | null): string {
  return priorityId != null ? (PRIORITY_BORDER[priorityId] ?? "border-l-slate-400") : "border-l-slate-400"
}

function priorityChipClass(priorityId?: number | null): string {
  return priorityId != null ? (PRIORITY_CHIP[priorityId] ?? "bg-slate-100 text-slate-600") : "bg-slate-100 text-slate-600"
}

function priorityDotClass(priorityId?: number | null): string {
  return priorityId != null ? (PRIORITY_DOT[priorityId] ?? "bg-slate-400") : "bg-slate-400"
}

interface WeekCalendarProps {
  tasks?: TaskPublic[]
}

export default function WeekCalendar({ tasks = [] }: WeekCalendarProps) {
  const queryClient = useQueryClient()
  const container = useRef<HTMLDivElement>(null)
  const containerNav = useRef<HTMLDivElement>(null)
  const containerOffset = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLOListElement>(null)

  const columnPosition: Array<string> = [
    "sm:col-start-1",
    "sm:col-start-2",
    "sm:col-start-3",
    "sm:col-start-4",
    "sm:col-start-5",
    "sm:col-start-6",
    "sm:col-start-7",
  ]

  useEffect(() => {
    // Set the container scroll position based on the current time.
    const currentMinute = new Date().getHours() * 60
    if (container.current && containerNav.current && containerOffset.current) {
      container.current.scrollTop =
        ((container.current.scrollHeight -
          containerNav.current.offsetHeight -
          containerOffset.current.offsetHeight) *
          currentMinute) /
        1440
    }
  }, [])

  const [view, setView] = useState("week")
  const today = startOfToday()
  const hours = eachHourOfInterval({
    start: startOfDay(today),
    end: endOfDay(today),
  }).map((hour) => format(hour, "ha"))
  const [currentWeek, setCurrentWeek] = useState(format(today, "yyyy-MM-dd"))
  const firstDayCurrentWeek = parse(currentWeek, "yyyy-MM-dd", new Date())
  const daysOfWeek = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentWeek),
    end: endOfWeek(firstDayCurrentWeek),
  })

  // --- Drag state ---
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number; slotIndex: number } | null>(null)

  // --- Resize state ---
  const resizeRef = useRef<{
    taskId: string
    startY: number
    originalDuration: number
  } | null>(null)
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null)
  const [resizeDuration, setResizeDuration] = useState<number | null>(null)

  // --- Edit dialog state ---
  const [editingTask, setEditingTask] = useState<TaskPublic | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDuration, setEditDuration] = useState(30)
  // Track mouse down position to distinguish click from drag
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  const activeTasks = tasks.filter((t) => !t.completed)

  // Tasks with scheduled_start → timed blocks
  const timedTasks = activeTasks.filter((t) => t.scheduled_start != null)

  // Tasks with only due date (no scheduled_start) → all-day chips
  const dueTasks = activeTasks.filter(
    (t) => t.scheduled_start == null && t.due != null,
  )

  // Tasks with no scheduled_start and no due date → unscheduled panel
  const unscheduledTasks = activeTasks.filter(
    (t) => t.scheduled_start == null && t.due == null,
  )

  function previousWeek() {
    const firstDayPreviousWeek = addWeeks(firstDayCurrentWeek, -1)
    setCurrentWeek(format(firstDayPreviousWeek, "yyyy-MM-dd"))
  }

  function nextWeek() {
    const firstDayNextWeek = addWeeks(firstDayCurrentWeek, 1)
    setCurrentWeek(format(firstDayNextWeek, "yyyy-MM-dd"))
  }

  function thisWeek() {
    setCurrentWeek(format(today, "yyyy-MM-dd"))
  }

  // --- Helpers for save/reschedule ---
  async function saveTaskAndReschedule(taskId: string, updates: Partial<TaskPublic>) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    await TasksService.updateTask({
      id: taskId,
      requestBody: { ...task, ...updates, owner_id: task.owner_id },
    })
    await TasksService.scheduleTasks()
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
  }

  // --- Drag handlers ---
  function handleTaskDragStart(e: React.DragEvent, task: TaskPublic) {
    e.dataTransfer.setData("taskId", task.id)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleSlotDragOver(e: React.DragEvent, dayIndex: number, slotIndex: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverSlot({ dayIndex, slotIndex })
  }

  function handleSlotDrop(e: React.DragEvent, dayIndex: number, slotIndex: number) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("taskId")
    if (!taskId) return
    setDragOverSlot(null)

    const weekStart = startOfWeek(firstDayCurrentWeek)
    const dropDay = addDays(weekStart, dayIndex)
    const dropHour = Math.floor(slotIndex / 2)
    const dropMinute = (slotIndex % 2) * 30
    const newStart = setMinutes(setHours(dropDay, dropHour), dropMinute)

    saveTaskAndReschedule(taskId, { scheduled_start: newStart.toISOString() })
  }

  function handleSlotDragLeave() {
    setDragOverSlot(null)
  }

  // --- Resize handlers ---
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
      // Each grid row ~ 1.75rem / 288 rows total. Use a fixed estimate.
      // The grid area height varies; use 4px per 5-minute row as a reasonable default.
      const rowHeightPx = 4
      const deltaRows = Math.round(deltaY / rowHeightPx)
      const newDuration = Math.max(30, resizeRef.current.originalDuration + deltaRows * 5)
      setResizeDuration(newDuration)
    }

    async function onMouseUp(ev: MouseEvent) {
      if (!resizeRef.current) return
      const deltaY = ev.clientY - resizeRef.current.startY
      const rowHeightPx = 4
      const deltaRows = Math.round(deltaY / rowHeightPx)
      const newDuration = Math.max(30, resizeRef.current.originalDuration + deltaRows * 5)
      const taskId = resizeRef.current.taskId

      resizeRef.current = null
      setResizingTaskId(null)
      setResizeDuration(null)

      if (deltaRows !== 0) {
        await saveTaskAndReschedule(taskId, { duration: newDuration })
      }

      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  // --- Edit dialog handlers ---
  function handleTaskMouseDown(e: React.MouseEvent) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }

  function handleTaskClick(e: React.MouseEvent, task: TaskPublic) {
    if (!mouseDownPos.current) return
    const dx = Math.abs(e.clientX - mouseDownPos.current.x)
    const dy = Math.abs(e.clientY - mouseDownPos.current.y)
    mouseDownPos.current = null
    // Only treat as click if mouse moved less than 5px (not a drag)
    if (dx > 5 || dy > 5) return
    setEditingTask(task)
    setEditTitle(task.title ?? "")
    setEditDuration(task.duration ?? 30)
  }

  async function handleEditSave() {
    if (!editingTask) return
    await saveTaskAndReschedule(editingTask.id, {
      title: editTitle,
      duration: editDuration,
    })
    setEditingTask(null)
  }

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader>
        <h1 className="text-base font-semibold leading-6 text-foreground">
          <time dateTime={format(firstDayCurrentWeek, "yyyy-MM")}>
            {format(firstDayCurrentWeek, "MMMM y")}
          </time>
        </h1>
        <div className="flex items-center">
          <NavigationButtons
            previousWeek={previousWeek}
            nextWeek={nextWeek}
            thisWeek={thisWeek}
          />
          <div className="hidden md:ml-4 md:flex md:items-center">
            <ViewMenu view={view} setView={setView} />
          </div>
          <div className="relative ml-6 md:hidden">
            <ThreeDotMenu view={view} setView={setView} />
          </div>
        </div>
      </CalendarHeader>

      {/* Unscheduled tasks panel */}
      {unscheduledTasks.length > 0 && (
        <div
          data-testid="unscheduled-panel"
          className="flex items-center gap-2 border-b px-4 py-2 bg-muted/30"
        >
          <span className="text-xs font-medium text-muted-foreground flex-none">Unscheduled</span>
          <div className="flex gap-1.5 overflow-x-auto">
            {unscheduledTasks.map((task) => (
              <span
                key={task.id}
                className={cn(
                  "inline-flex items-center gap-1 truncate rounded-full px-2 py-0.5 text-xs font-medium max-w-[160px] shrink-0",
                  priorityChipClass(task.priority_id),
                )}
                title={task.title ?? ""}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full flex-none", priorityDotClass(task.priority_id))} />
                {task.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        ref={container}
        className="isolate flex flex-auto flex-col overflow-auto bg-card"
      >
        <div
          style={{ width: "165%" }}
          className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full"
        >
          {/* Column names e.g. Wed 12 */}
          <div
            ref={containerNav}
            className="sticky top-0 z-30 flex-none bg-card shadow ring-1 ring-black ring-opacity-5 sm:pr-8"
          >
            {/* Mobile view */}
            <div className="grid grid-cols-7 text-sm leading-6 text-gray-500 sm:hidden">
              {daysOfWeek.map((day) => (
                <button
                  key={day.toString()}
                  type="button"
                  className="flex flex-col items-center pb-3 pt-2"
                >
                  {format(day, "EEEEE")}{" "}
                  <span
                    className={cn(
                      "mt-1 flex h-6 w-6 items-center justify-center font-semibold",
                      !isToday(day)
                        ? "text-foreground"
                        : "bg-indigo-600 rounded-full text-white",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </button>
              ))}
            </div>

            {/* Desktop view */}
            <div className="-mr-px hidden grid-cols-7 divide-x border-r text-sm leading-6 text-gray-500 sm:grid">
              <div className="col-end-1 w-14" />
              {daysOfWeek.map((day) => (
                <div
                  key={day.toString()}
                  className="flex flex-col items-center justify-start py-3 gap-1"
                >
                  <span
                    className={cn(!isToday(day) ? "" : "flex items-baseline")}
                  >
                    {format(day, "EEE")}{" "}
                    <span
                      className={cn(
                        "items-center justify-center font-semibold",
                        !isToday(day)
                          ? "text-foreground"
                          : "ml-1.5 flex h-6 w-6 rounded-full bg-indigo-600 text-white",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </span>
                  <div className="flex flex-col gap-0.5 w-full px-1">
                    {dueTasks
                      .filter((t) => isSameDay(parseISO(t.due!), day))
                      .map((t) => (
                        <span
                          key={t.id}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-xs font-medium",
                            priorityChipClass(t.priority_id),
                          )}
                          title={t.title ?? ""}
                        >
                          {t.title}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-auto">
            <div className="sticky left-0 z-10 w-14 flex-none bg-card ring-1 ring-gray-100 dark:ring-gray-800" />
            <div className="grid flex-auto grid-cols-1 grid-rows-1">
              {/* Horizontal lines */}
              <div
                className="col-start-1 col-end-2 row-start-1 grid divide-y"
                style={{ gridTemplateRows: "repeat(48, minmax(3.5rem, 1fr))" }}
              >
                <div ref={containerOffset} className="row-end-1 h-7" />
                {hours.map((hour, index) => (
                  <React.Fragment key={index}>
                    <div>
                      <div className="sticky left-0 z-20 -ml-14 -mt-2.5 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                        {hour}
                      </div>
                    </div>
                    <div />
                  </React.Fragment>
                ))}
              </div>

              {/* Vertical lines */}
              <div className="col-start-1 col-end-2 row-start-1 hidden grid-cols-7 grid-rows-1 divide-x sm:grid sm:grid-cols-7">
                <div className="col-start-1 row-span-full" />
                <div className="col-start-2 row-span-full" />
                <div className="col-start-3 row-span-full" />
                <div className="col-start-4 row-span-full" />
                <div className="col-start-5 row-span-full" />
                <div className="col-start-6 row-span-full" />
                <div className="col-start-7 row-span-full" />
                <div className="col-start-8 row-span-full w-8" />
              </div>

              {/* Drop target slots overlay */}
              <div
                className="col-start-1 col-end-2 row-start-1 hidden sm:grid sm:grid-cols-7 sm:pr-8"
                style={{ gridTemplateRows: "1.75rem repeat(288, minmax(0, 1fr)) auto" }}
                aria-hidden="true"
              >
                {daysOfWeek.map((_, dayIndex) => (
                  // 48 half-hour slots per day (0:00–23:30)
                  Array.from({ length: 48 }, (__, slotIndex) => {
                    const startRow = slotIndex * 6 + 2 // 6 rows per 30 min
                    const isHighlighted =
                      dragOverSlot?.dayIndex === dayIndex &&
                      dragOverSlot?.slotIndex === slotIndex
                    return (
                      <div
                        key={`${dayIndex}-${slotIndex}`}
                        className={cn(
                          columnPosition[dayIndex],
                          "transition-colors",
                          isHighlighted ? "bg-indigo-100/60 dark:bg-indigo-900/30" : "",
                        )}
                        style={{ gridRow: `${startRow} / span 6` }}
                        onDragOver={(e) => handleSlotDragOver(e, dayIndex, slotIndex)}
                        onDrop={(e) => handleSlotDrop(e, dayIndex, slotIndex)}
                        onDragLeave={handleSlotDragLeave}
                      />
                    )
                  })
                ))}
              </div>

              {/* Events */}
              <ol
                ref={gridRef}
                className="col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7 sm:pr-8"
                style={{
                  gridTemplateRows: "1.75rem repeat(288, minmax(0, 1fr)) auto",
                }}
              >
                {timedTasks.map((task) => {
                  const startTime = parseISO(task.scheduled_start!)
                  const weekStart = startOfWeek(firstDayCurrentWeek)
                  const weekEnd = endOfWeek(firstDayCurrentWeek)
                  // Skip tasks not in the current week
                  if (startTime < weekStart || startTime > weekEnd) return null
                  const dayIndex = differenceInDays(startTime, weekStart)
                  const minutesFromMidnight = differenceInMinutes(
                    startTime,
                    startOfDay(startTime),
                  )
                  const effectiveDuration =
                    resizingTaskId === task.id && resizeDuration != null
                      ? resizeDuration
                      : (task.duration ?? 30)
                  const spanRows = Math.max(
                    1,
                    Math.round((effectiveDuration * 12) / 60),
                  )
                  const startRow = Math.round((minutesFromMidnight * 12) / 60) + 2
                  return (
                    <li
                      key={task.id}
                      className={cn(
                        "relative mt-px flex",
                        columnPosition[dayIndex],
                      )}
                      style={{
                        gridRow: `${startRow} / span ${spanRows}`,
                      }}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task)}
                    >
                      <div
                        data-testid="calendar-task-block"
                        className={cn(
                          "group absolute inset-1 flex flex-col overflow-y-auto rounded-lg border-l-4 bg-card p-2 text-xs leading-5 shadow-sm hover:shadow-md cursor-pointer select-none",
                          priorityBorderClass(task.priority_id),
                        )}
                        onMouseDown={handleTaskMouseDown}
                        onMouseUp={(e) => handleTaskClick(e, task)}
                      >
                        <p className="order-1 font-semibold text-foreground truncate">
                          {task.title}
                        </p>
                        <p className="text-muted-foreground">
                          <time dateTime={format(startTime, "yyyy-MM-dd HH:mm")}>
                            {format(startTime, "h:mma")}
                          </time>
                        </p>
                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize bg-transparent hover:bg-white/20 rounded-b"
                          onMouseDown={(e) => handleResizeStart(e, task)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Edit task dialog */}
      <Dialog
        open={editingTask != null}
        onOpenChange={(open) => { if (!open) setEditingTask(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleEditSave() }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-duration">Duration (minutes)</Label>
              <Input
                id="edit-duration"
                type="number"
                min={15}
                step={15}
                value={editDuration}
                onChange={(e) => setEditDuration(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleEditSave} className="w-full">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ViewMenuProps {
  view: string
  setView: React.Dispatch<React.SetStateAction<string>>
}

function ViewMenu({ view, setView }: ViewMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative">
          Week view <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={view} onValueChange={setView}>
          <DropdownMenuRadioItem value="day">Day view</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="week">Week view</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="month">
            Month view
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="year">Year view</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ThreeDotMenu({ view, setView }: ViewMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Ellipsis className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <span>Go to today</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={view} onValueChange={setView}>
          <DropdownMenuRadioItem value="day">Day view</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="week">Week view</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="month">
            Month view
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="year">Year view</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface NavigationButtonsProps {
  previousWeek: () => void
  nextWeek: () => void
  thisWeek: () => void
}

function NavigationButtons({
  previousWeek,
  nextWeek,
  thisWeek,
}: NavigationButtonsProps) {
  return (
    <div className="relative flex items-center rounded-md bg-card shadow-sm md:items-stretch">
      <button
        onClick={previousWeek}
        type="button"
        className="flex h-9 w-12 items-center justify-center rounded-l-md border-y border-l pr-1 text-accent-foreground focus:relative md:w-9 md:pr-0 md:hover:bg-accent"
      >
        <span className="sr-only">Previous week</span>
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        onClick={thisWeek}
        type="button"
        className="hidden border-y px-3.5 text-sm font-semibold text-foreground hover:bg-accent focus:relative md:block"
      >
        Today
      </button>
      <span className="relative -mx-px h-5 w-px bg-muted md:hidden" />
      <button
        onClick={nextWeek}
        type="button"
        className="flex h-9 w-12 items-center justify-center rounded-r-md border-y border-r pl-1 text-accent-foreground focus:relative md:w-9 md:pl-0 md:hover:bg-accent"
      >
        <span className="sr-only">Next week</span>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}

interface HeaderProps {
  children: ReactNode
}

function CalendarHeader({ children }: HeaderProps) {
  return (
    <header className="flex flex-none items-center justify-between border-b px-6 py-4">
      {children}
    </header>
  )
}
