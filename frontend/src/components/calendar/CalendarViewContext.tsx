import { createContext, useContext, useState } from "react"
import type { CalendarView } from "./shared"

interface CalendarViewContextValue {
  view: CalendarView
  setView: (v: CalendarView) => void
}

const CalendarViewContext = createContext<CalendarViewContextValue>({
  view: "week",
  setView: () => {},
})

export function CalendarViewProvider({
  children,
}: { children: React.ReactNode }) {
  const [view, setView] = useState<CalendarView>("week")
  return (
    <CalendarViewContext.Provider value={{ view, setView }}>
      {children}
    </CalendarViewContext.Provider>
  )
}

export function useCalendarView() {
  return useContext(CalendarViewContext)
}
