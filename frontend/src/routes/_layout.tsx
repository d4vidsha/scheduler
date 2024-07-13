import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { Spinner } from "@/components/Common/Spinner"
import NavBar from "@/components/navbar"
import useAuth, { isLoggedIn } from "../hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  const { isLoading } = useAuth()

  return (
    <>
      <NavBar />
      {isLoading ? (
        <div className="flex justify-center items-center h-[calc(100vh-64px)] w-full">
          <Spinner size="large" />
        </div>
      ) : (
        <Outlet />
      )}
    </>
  )
}
