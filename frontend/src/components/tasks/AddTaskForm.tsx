import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TasksService } from "@/client/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

export function AddTaskForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const showToast = useCustomToast()

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: TaskFormValues) => {
      if (!user) throw new Error("Not authenticated")

      // Only send the required fields
      return TasksService.createTask({
        requestBody: {
          title: data.title,
          description: data.description || ""
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      form.reset()
      showToast("Success", "Task created successfully", "success")
      onSuccess?.()
    },
    onError: (error) => {
      console.error("Error creating task:", error)
      showToast("Error", "Failed to create task. Please try again.", "error")
    },
  })

  function onSubmit(values: TaskFormValues) {
    mutation.mutate(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Task title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Description (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.status === 'pending'}>
          {mutation.status === 'pending' ? "Adding..." : "Add Task"}
        </Button>
      </form>
    </Form>
  )
}
