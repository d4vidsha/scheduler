import { TasksService } from "@/client/services"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Mention, MentionsInput } from "react-mentions"

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

const DATE_PATTERN = new RegExp(
  `\\b(today|tomorrow|${DAY_NAMES.join("|")})\\b`,
  "i",
)

function parseNextDate(dayStr: string): string {
  const now = new Date()
  if (dayStr === "today") return now.toISOString()
  if (dayStr === "tomorrow") {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return d.toISOString()
  }
  const targetDay = DAY_NAMES.indexOf(dayStr)
  const currentDay = now.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) daysUntil += 7
  const d = new Date(now)
  d.setDate(d.getDate() + daysUntil)
  return d.toISOString()
}

function parseNaturalLanguage(
  value: string,
  plainText: string,
): {
  title: string
  tags: string[] | null
  priorityId: number | null
  due: string | null
} {
  // Extract tags from react-mentions markup: @[display](id)
  const tags = [...value.matchAll(/@\[([^\]]+)\]\([^)]+\)/g)].map((m) => m[1])

  // Extract priority p1–p4 from plain text
  const priorityMatch = plainText.match(/\bp([1-4])\b/i)
  const priorityId = priorityMatch ? Number.parseInt(priorityMatch[1]) : null

  // Extract date from plain text
  const dateMatch = plainText.match(DATE_PATTERN)
  const due = dateMatch ? parseNextDate(dateMatch[1].toLowerCase()) : null

  // Build clean title: remove @mentions, priority token, date token
  const title = plainText
    .replace(/@\S+/g, "")
    .replace(/\bp[1-4]\b/gi, "")
    .replace(DATE_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()

  return { title, tags: tags.length > 0 ? tags : null, priorityId, due }
}

const mentionsInputStyle = {
  control: {
    fontSize: 14,
    lineHeight: 1.5,
  },
  input: {
    padding: "8px 12px",
    border: "1px solid hsl(var(--input))",
    borderRadius: "6px",
    outline: "none",
    backgroundColor: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    width: "100%",
  },
  highlighter: {
    padding: "8px 12px",
    border: "1px solid transparent",
  },
  suggestions: {
    list: {
      backgroundColor: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "6px",
      fontSize: 14,
      overflow: "hidden",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    },
    item: {
      padding: "6px 12px",
      cursor: "pointer",
    },
  },
}

const mentionStyle = {
  backgroundColor: "hsl(var(--accent))",
  borderRadius: "3px",
  padding: "1px 2px",
}

export function AddTaskForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const showToast = useCustomToast()
  const [value, setValue] = useState("")
  const [plainText, setPlainText] = useState("")

  const mutation = useMutation({
    mutationFn: ({
      title,
      tags,
      priorityId,
      due,
    }: {
      title: string
      tags: string[] | null
      priorityId: number | null
      due: string | null
    }) => {
      if (!user) throw new Error("Not authenticated")
      return TasksService.createTask({
        requestBody: {
          title,
          tags,
          priority_id: priorityId,
          due,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setValue("")
      setPlainText("")
      showToast("Success", "Task created successfully", "success")
      onSuccess?.()
    },
    onError: (error) => {
      console.error("Error creating task:", error)
      showToast("Error", "Failed to create task. Please try again.", "error")
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const { title, tags, priorityId, due } = parseNaturalLanguage(
          value,
          plainText,
        )
        if (!title) return
        mutation.mutate({ title, tags, priorityId, due })
      }}
      className="flex gap-2"
    >
      <div className="flex-1">
        <MentionsInput
          value={value}
          onChange={(_e, newValue, newPlainText) => {
            setValue(newValue)
            setPlainText(newPlainText)
          }}
          placeholder="Task title @tag p1 monday — press Enter to add"
          singleLine
          style={mentionsInputStyle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              const { title, tags, priorityId, due } = parseNaturalLanguage(
                value,
                plainText,
              )
              if (!title) return
              mutation.mutate({ title, tags, priorityId, due })
            }
          }}
        >
          <Mention
            trigger="@"
            data={(search) => (search ? [{ id: search, display: search }] : [])}
            style={mentionStyle}
            appendSpaceOnAdd
          />
        </MentionsInput>
      </div>
      <Button
        type="submit"
        disabled={mutation.status === "pending" || !plainText.trim()}
      >
        {mutation.status === "pending" ? "Adding..." : "Add"}
      </Button>
    </form>
  )
}
