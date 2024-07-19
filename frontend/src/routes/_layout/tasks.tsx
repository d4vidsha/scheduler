import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tasks")({
  component: Tasks,
})

function Tasks() {
  return <>Hello world</>
}
