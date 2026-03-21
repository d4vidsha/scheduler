import { TasksService } from "@/client/services"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
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

function formatNaiveLocal(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss")
}

function parseNextDate(dayStr: string): string {
  const now = new Date()
  if (dayStr === "today") return formatNaiveLocal(now)
  if (dayStr === "tomorrow") {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return formatNaiveLocal(d)
  }
  const targetDay = DAY_NAMES.indexOf(dayStr)
  const currentDay = now.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) daysUntil += 7
  const d = new Date(now)
  d.setDate(d.getDate() + daysUntil)
  return formatNaiveLocal(d)
}

const DURATION_PATTERN = /\b(\d+)h(?:(\d+)m)?\b|\b(\d+)m\b/

function parseDuration(text: string): number | null {
  const match = text.match(DURATION_PATTERN)
  if (!match) return null
  if (match[3] !== undefined) {
    // matched Xm only
    return Number.parseInt(match[3])
  }
  // matched Xh or XhYm
  const hours = Number.parseInt(match[1])
  const minutes = match[2] !== undefined ? Number.parseInt(match[2]) : 0
  return hours * 60 + minutes
}

function parseNaturalLanguage(
  value: string,
  plainText: string,
): {
  title: string
  tags: string[] | null
  priorityId: number | null
  due: string | null
  duration: number | null
} {
  // Extract tags from react-mentions markup: @[display](id)
  const tags = [...value.matchAll(/@\[([^\]]+)\]\([^)]+\)/g)].map((m) => m[1])

  // Extract priority p1–p4 from plain text
  const priorityMatch = plainText.match(/\bp([1-4])\b/i)
  const priorityId = priorityMatch ? Number.parseInt(priorityMatch[1]) : null

  // Extract date from plain text
  const dateMatch = plainText.match(DATE_PATTERN)
  const due = dateMatch ? parseNextDate(dateMatch[1].toLowerCase()) : null

  // Extract duration from plain text
  const duration = parseDuration(plainText)

  // Build clean title: remove @mentions, priority token, date token, duration token
  const title = plainText
    .replace(/@\S+/g, "")
    .replace(/\bp[1-4]\b/gi, "")
    .replace(DATE_PATTERN, "")
    .replace(DURATION_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()

  return {
    title,
    tags: tags.length > 0 ? tags : null,
    priorityId,
    due,
    duration,
  }
}

function getMentionsInputStyle(isDark: boolean) {
  return {
    control: {
      fontSize: 14,
      lineHeight: 1.5,
    },
    input: {
      padding: "10px 14px",
      border: "none",
      borderRadius: "12px",
      outline: "none",
      backgroundColor: isDark ? "#1e293b" : "#f0f4fc",
      color: isDark ? "#f1f5f9" : "#171c22",
      width: "100%",
      transition: "background-color 0.2s, box-shadow 0.2s",
    },
    highlighter: {
      padding: "10px 14px",
      border: "1px solid transparent",
    },
    suggestions: {
      list: {
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        border: "none",
        borderRadius: "12px",
        fontSize: 14,
        overflow: "hidden",
        boxShadow: isDark
          ? "0 12px 32px rgba(0, 0, 0, 0.4)"
          : "0 12px 32px rgba(23, 28, 34, 0.06)",
      },
      item: {
        padding: "8px 14px",
        cursor: "pointer",
        color: isDark ? "#f1f5f9" : "#171c22",
      },
    },
  }
}

function getMentionStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? "#334155" : "#eaeef6",
    borderRadius: "4px",
    padding: "1px 3px",
  }
}

export function AddTaskForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const showToast = useCustomToast()
  const { theme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  const [value, setValue] = useState("")
  const [plainText, setPlainText] = useState("")

  const mutation = useMutation({
    mutationFn: ({
      title,
      tags,
      priorityId,
      due,
      duration,
    }: {
      title: string
      tags: string[] | null
      priorityId: number | null
      due: string | null
      duration: number | null
    }) => {
      if (!user) throw new Error("Not authenticated")
      return TasksService.createTask({
        requestBody: {
          title,
          tags,
          priority_id: priorityId,
          due,
          duration,
        },
      })
    },
    onSuccess: () => {
      TasksService.scheduleTasks().finally(() => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] })
      })
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
        const { title, tags, priorityId, due, duration } = parseNaturalLanguage(
          value,
          plainText,
        )
        if (!title) return
        mutation.mutate({ title, tags, priorityId, due, duration })
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
          placeholder="Task title @tag p1 monday 1h30m — press Enter to add"
          singleLine
          style={getMentionsInputStyle(isDark)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              const { title, tags, priorityId, due, duration } =
                parseNaturalLanguage(value, plainText)
              if (!title) return
              mutation.mutate({ title, tags, priorityId, due, duration })
            }
          }}
        >
          <Mention
            trigger="@"
            data={(search) => (search ? [{ id: search, display: search }] : [])}
            style={getMentionStyle(isDark)}
            appendSpaceOnAdd
          />
        </MentionsInput>
      </div>
      <Button
        type="submit"
        disabled={mutation.status === "pending" || !plainText.trim()}
        className="bg-gradient-to-r from-primary to-primary-container dark:to-primary/70 text-white rounded-xl hover:opacity-90 transition-all"
      >
        {mutation.status === "pending" ? "Adding..." : "Add"}
      </Button>
    </form>
  )
}
