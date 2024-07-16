import {
  Link as RouterLink,
  createFileRoute,
  redirect,
} from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"
import { UserAuthForm } from "@/components/user-auth-form"
import { isLoggedIn } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { ChevronLeft } from "lucide-react"
import Logo from "/assets/images/calendar-icon.svg"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function Login() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <RouterLink
        to="/"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute left-4 top-4 md:left-8 md:top-8",
        )}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </RouterLink>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <img src={Logo} alt="Scheduler logo" className="mx-auto h-8 w-8" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>
        <UserAuthForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          {/* use /register when we have the route */}
          <RouterLink to="/" className="underline underline-offset-4">
            Don&apos;t have an account? Sign Up
          </RouterLink>
        </p>
      </div>
    </div>
  )
}
