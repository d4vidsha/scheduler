import { cn } from "@/lib/utils"
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/20/solid"
import {
  addHours,
  differenceInDays,
  differenceInMinutes,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfDay,
  endOfWeek,
  format,
  isToday,
  startOfDay,
  startOfToday,
  startOfWeek,
} from "date-fns"
import { ChevronDown } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export default function WeekCalendar() {
  const container = useRef<HTMLDivElement>(null)
  const containerNav = useRef<HTMLDivElement>(null)
  const containerOffset = useRef<HTMLDivElement>(null)

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
  const daysOfWeek = eachDayOfInterval({
    start: startOfWeek(today),
    end: endOfWeek(today),
  })
  const events = [
    { id: 1, title: "Breakfast", time: addHours(today, 8), duration: 60 },
    {
      id: 2,
      title: "Flight to Paris",
      time: addHours(today, 11),
      duration: 30,
    },
    {
      id: 3,
      title: "Meeting with design team at Disney Land",
      time: addHours(today, 13),
      duration: 120,
    },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Calendar header */}
      <header className="flex flex-none items-center justify-between border-b px-6 py-4">
        {/* Calendar title date */}
        <h1 className="text-base font-semibold leading-6 text-foreground">
          <time dateTime={format(today, "yyyy-MM")}>
            {format(today, "MMMM y")}
          </time>
        </h1>

        <div className="flex items-center">
          {/* Today navigation buttons */}
          <div className="relative flex items-center rounded-md bg-card shadow-sm md:items-stretch">
            <button
              type="button"
              className="flex h-9 w-12 items-center justify-center rounded-l-md border-y border-l pr-1 text-accent-foreground focus:relative md:w-9 md:pr-0 md:hover:bg-accent"
            >
              <span className="sr-only">Previous week</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="hidden border-y px-3.5 text-sm font-semibold text-foreground hover:bg-accent focus:relative md:block"
            >
              Today
            </button>
            <span className="relative -mx-px h-5 w-px bg-muted md:hidden" />
            <button
              type="button"
              className="flex h-9 w-12 items-center justify-center rounded-r-md border-y border-r pl-1 text-accent-foreground focus:relative md:w-9 md:pl-0 md:hover:bg-accent"
            >
              <span className="sr-only">Next week</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Desktop week view dropdown */}
          <div className="hidden md:ml-4 md:flex md:items-center">
            <ViewMenu view={view} setView={setView} />
          </div>

          {/* Mobile three dot menu */}
          <ThreeDotMenu />
        </div>
      </header>

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
                      "mt-1 flex h-8 w-8 items-center justify-center font-semibold",
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
                  className="flex items-center justify-center py-3"
                >
                  <span
                    className={cn(!isToday(day) ? "" : "flex items-baseline")}
                  >
                    {format(day, "EEE")}{" "}
                    <span
                      className={cn(
                        !isToday(day)
                          ? "items-center justify-center font-semibold text-foreground"
                          : "ml-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </span>
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

              {/* Events */}
              <ol
                className="col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7 sm:pr-8"
                style={{
                  gridTemplateRows: "1.75rem repeat(288, minmax(0, 1fr)) auto",
                }}
              >
                {events.map(({ id, title, time, duration }) => (
                  <li
                    key={id}
                    className={cn(
                      "relative mt-px flex",
                      "sm:col-start-".concat(
                        (
                          differenceInDays(time, startOfWeek(time)) + 1
                        ).toString(),
                      ),
                    )}
                    style={{
                      gridRow: cn(
                        (differenceInMinutes(time, today) * 12) / 60 + 2,
                        "/ span",
                        (duration * 12) / 60,
                      ),
                    }}
                  >
                    <a
                      href="#"
                      className="group absolute inset-1 flex flex-col overflow-y-auto rounded-lg bg-blue-50 p-2 text-xs leading-5 hover:bg-blue-100"
                    >
                      <p className="order-1 font-semibold text-blue-700">
                        {title}
                      </p>
                      <p className="text-blue-500 group-hover:text-blue-700">
                        <time dateTime={format(time, "yyyy-MM-dd HH:mm")}>
                          {format(time, "h:mma")}
                        </time>
                      </p>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
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

function ThreeDotMenu() {
  return (
    <Menu as="div" className="relative ml-6 md:hidden">
      <MenuButton className="-mx-2 flex items-center rounded-full border border-transparent p-2 text-accent-foreground">
        <span className="sr-only">Open menu</span>
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-10 mt-3 w-36 origin-top-right divide-y divide-gray-100 overflow-hidden rounded-md bg-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
      >
        <div className="py-1">
          <MenuItem>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-foreground"
            >
              Create event
            </a>
          </MenuItem>
        </div>
        <div className="py-1">
          <MenuItem>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-foreground"
            >
              Go to today
            </a>
          </MenuItem>
        </div>
        <div className="py-1">
          <MenuItem>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-foreground"
            >
              Day view
            </a>
          </MenuItem>
          <MenuItem>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-foreground"
            >
              Week view
            </a>
          </MenuItem>
          <MenuItem>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-foreground"
            >
              Month view
            </a>
          </MenuItem>
          <MenuItem>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-foreground"
            >
              Year view
            </a>
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  )
}
