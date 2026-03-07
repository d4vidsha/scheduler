import { addDays, nextDay, startOfDay } from "date-fns"

export interface ParsedTask {
  title: string
  tags: string[]
  priority_id: number | null
  due: string | null
}

const WEEKDAYS: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export function parseTaskInput(raw: string): ParsedTask {
  let text = raw

  // Extract @mentions — react-mentions format: @[display](id)
  const tags: string[] = []
  text = text.replace(/@\[(\w+)\]\(\w+\)/g, (_, display: string) => {
    tags.push(display)
    return ""
  })
  // Plain @word fallback
  text = text.replace(/@(\w+)/g, (_, word: string) => {
    tags.push(word)
    return ""
  })

  // Extract priority p1–p4
  let priority_id: number | null = null
  text = text.replace(/\bp([1-4])\b/gi, (_, n: string) => {
    priority_id = Number.parseInt(n, 10)
    return ""
  })

  // Extract due date
  let due: string | null = null
  const today = startOfDay(new Date())

  text = text.replace(/\btoday\b/gi, () => {
    due = today.toISOString()
    return ""
  })
  text = text.replace(/\btomorrow\b/gi, () => {
    due = addDays(today, 1).toISOString()
    return ""
  })

  for (const [name, dayIndex] of Object.entries(WEEKDAYS)) {
    const pattern = new RegExp(`\\b${name}\\b`, "gi")
    if (pattern.test(text)) {
      text = text.replace(new RegExp(`\\b${name}\\b`, "gi"), "")
      if (due === null) {
        due = nextDay(today, dayIndex).toISOString()
      }
    }
  }

  const title = text.replace(/\s+/g, " ").trim()

  return { title, tags, priority_id, due }
}
