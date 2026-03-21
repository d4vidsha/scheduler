import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { Spinner } from "@/components/Common/Spinner"
import Sidebar from "@/components/sidebar"
import { Toaster } from "@/components/ui/toaster"
import UserMenu from "@/components/user-menu"
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
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-8 h-16 sticky top-0 bg-surface z-40 transition-colors duration-200">
          <div className="flex items-center space-x-8">
            <span className="text-xl font-bold text-on-surface tracking-tight">
              Planner
            </span>
            <nav className="flex space-x-6 text-sm">
              <span className="text-on-surface-variant font-medium hover:text-on-surface transition-colors cursor-pointer">
                Day
              </span>
              <span className="text-primary-container font-semibold border-b-2 border-primary-container pb-1 transition-colors cursor-pointer">
                Week
              </span>
              <span className="text-on-surface-variant font-medium hover:text-on-surface transition-colors cursor-pointer">
                Month
              </span>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="bg-surface-container hover:bg-surface-container-high text-primary-container px-4 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all active:opacity-80"
            >
              Auto-Schedule
            </button>
            <div className="flex items-center space-x-2 text-on-surface-variant">
              <button
                type="button"
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  notifications
                </span>
              </button>
              <button
                type="button"
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  settings
                </span>
              </button>
            </div>
            <UserMenu />
          </div>
        </header>

        {/* Main Content */}
        {isLoading ? (
          <div className="flex justify-center items-center flex-1 w-full">
            <Spinner size="large" />
          </div>
        ) : (
          <Outlet />
        )}
      </div>
      <Toaster />
    </>
  )
}
