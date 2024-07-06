import { createFileRoute } from "@tanstack/react-router"

import Calendar from "@/components/calendar"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="overflow-hidden h-[calc(100vh-65px)]">
      <Calendar />
    </div>
  )
}
