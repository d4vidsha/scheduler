import type { Body_login_login_access_token as AccessToken } from "@/client"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import useAuth from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { userAuthSchema } from "@/lib/validations/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import type { z } from "zod"
import { Spinner } from "./Common/Spinner"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

type FormData = z.infer<typeof userAuthSchema>

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const { loginMutation, resetError } = useAuth()
  const form = useForm<FormData>({
    mode: "onBlur",
    criteriaMode: "all",
    resolver: zodResolver(userAuthSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const EyeToggle = showPassword ? EyeOff : Eye

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    setIsLoading(true)
    if (form.formState.isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Email"
                    type="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="w-full relative">
                    <Input
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      disabled={isLoading}
                      {...field}
                    />
                    <EyeToggle
                      className="text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2"
                      size={18}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
                <FormDescription>
                  <p className="ml-1 text-sm">
                    <Link
                      to="/recover-password"
                      className="underline underline-offset-4"
                    >
                      Forgot password?
                    </Link>
                  </p>
                </FormDescription>
              </FormItem>
            )}
          />
          <Button variant="secondary" type="submit" disabled={isLoading}>
            {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Log In
          </Button>
        </form>
      </Form>
    </div>
  )
}
