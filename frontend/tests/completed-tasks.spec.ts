import { type Page, expect, test } from "@playwright/test"
import { randomString } from "./utils/random"

// Helper: format a Date as naive local ISO string (no timezone offset or Z suffix)
function toNaiveLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Helper: get an auth token from the page's localStorage
async function getToken(page: Page) {
  return page.evaluate(() => localStorage.getItem("access_token"))
}

// Track task IDs created during each test for cleanup
let createdTaskIds: string[] = []

// Helper: create a task via API (tracks ID for cleanup)
async function createTask(page: Page, data: Record<string, unknown>) {
  const token = await getToken(page)
  const response = await page.request.post(
    "http://localhost:8000/api/v1/tasks/",
    {
      headers: { Authorization: `Bearer ${token}` },
      data,
    },
  )
  expect(response.ok()).toBeTruthy()
  const task = await response.json()
  createdTaskIds.push(task.id)
  return task
}

// Helper: toggle task completed via API
async function toggleCompleted(page: Page, taskId: string) {
  const token = await getToken(page)
  const response = await page.request.put(
    `http://localhost:8000/api/v1/tasks/${taskId}/toggle-completed`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  expect(response.ok()).toBeTruthy()
  return response.json()
}

// Helper: delete a task via API
async function deleteTask(page: Page, taskId: string) {
  const token = await getToken(page)
  await page.request.delete(
    `http://localhost:8000/api/v1/tasks/${taskId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
}

// Helper: complete all incomplete tasks scheduled on today.
// Returns the IDs toggled so they can be un-toggled in cleanup.
async function completeAllTodayTasks(page: Page): Promise<string[]> {
  const token = await getToken(page)
  const resp = await page.request.get(
    "http://localhost:8000/api/v1/tasks/?limit=500",
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const tasks = (await resp.json()).data as Array<{
    id: string
    completed: boolean
    scheduled_start: string | null
  }>

  const todayStr = new Date().toISOString().split("T")[0]
  const toggled: string[] = []

  for (const t of tasks) {
    if (t.completed || !t.scheduled_start) continue
    if (!t.scheduled_start.startsWith(todayStr)) continue
    await toggleCompleted(page, t.id)
    toggled.push(t.id)
  }
  return toggled
}

// --- Completed tasks on calendar ---

test.describe("Completed tasks on calendar", () => {
  test.beforeEach(() => {
    createdTaskIds = []
  })
  test.afterEach(async ({ page }) => {
    for (const id of createdTaskIds) {
      await deleteTask(page, id)
    }
  })
  test("completed task remains visible on calendar with completion styling", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskTitle = `Completed Visible ${randomString(5)}`
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(10, 0, 0, 0)
    const created = await createTask(page, {
      title: taskTitle,
      scheduled_start: toNaiveLocal(yesterday),
      duration: 60,
    })

    // Mark completed via API
    await toggleCompleted(page, created.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    // Event should still be visible on the calendar
    const eventBlock = page.locator(".fc-event").filter({ hasText: taskTitle })
    await expect(eventBlock).toBeVisible({ timeout: 8000 })

    // Should have the fc-event-done marker class
    await expect(eventBlock).toHaveClass(/fc-event-done/)
  })

  test("completed task shows checkmark icon", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskTitle = `Check Icon ${randomString(5)}`
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(11, 0, 0, 0)
    const created = await createTask(page, {
      title: taskTitle,
      scheduled_start: toNaiveLocal(yesterday),
      duration: 30,
    })

    await toggleCompleted(page, created.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    const eventBlock = page.locator(".fc-event").filter({ hasText: taskTitle })
    await expect(eventBlock).toBeVisible({ timeout: 8000 })

    // Should have a checkmark inside the event
    await expect(
      eventBlock.locator(".material-symbols-outlined", { hasText: "check" }),
    ).toBeVisible()
  })

  test("completed task title has line-through", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskTitle = `Strikethrough ${randomString(5)}`
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(12, 0, 0, 0)
    const created = await createTask(page, {
      title: taskTitle,
      scheduled_start: toNaiveLocal(yesterday),
      duration: 30,
    })

    await toggleCompleted(page, created.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    const eventBlock = page.locator(".fc-event").filter({ hasText: taskTitle })
    await expect(eventBlock).toBeVisible({ timeout: 8000 })

    // The title paragraph should have line-through class
    await expect(eventBlock.locator("p.line-through")).toHaveCount(1)
  })

  test("completed task is not editable (not draggable)", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskTitle = `Not Draggable ${randomString(5)}`
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(10, 0, 0, 0)
    const created = await createTask(page, {
      title: taskTitle,
      scheduled_start: toNaiveLocal(yesterday),
      duration: 60,
    })

    await toggleCompleted(page, created.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    const eventBlock = page.locator(".fc-event").filter({ hasText: taskTitle })
    await expect(eventBlock).toBeVisible({ timeout: 8000 })

    // FullCalendar adds fc-event-draggable only to editable events
    await expect(eventBlock).not.toHaveClass(/fc-event-draggable/)
  })

  test("completed task is not flagged as conflicting", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(10, 0, 0, 0)

    // Create two overlapping tasks
    const titleA = `Conflict Done A ${randomString(4)}`
    const titleB = `Conflict Done B ${randomString(4)}`
    const taskA = await createTask(page, {
      title: titleA,
      scheduled_start: toNaiveLocal(yesterday),
      duration: 60,
    })
    await createTask(page, {
      title: titleB,
      scheduled_start: toNaiveLocal(yesterday),
      duration: 60,
    })

    // Complete one of them
    await toggleCompleted(page, taskA.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    // The completed task should NOT have conflict styling
    const eventA = page.locator(".fc-event").filter({ hasText: titleA })
    await expect(eventA).toBeVisible({ timeout: 8000 })
    await expect(eventA).not.toHaveClass(/fc-event-conflict/)
  })
})

// --- Achievement trail tests ---

test.describe.serial("Achievement trails", () => {
  test.beforeEach(() => {
    createdTaskIds = []
  })
  test.afterEach(async ({ page }) => {
    for (const id of createdTaskIds) {
      await deleteTask(page, id)
    }
  })
  test("trail line and dot appear between consecutive completed events on today", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Complete any existing incomplete tasks before our test window
    // so the chain can start from the top of the day and reach our tasks
    const toggledIds = await completeAllTodayTasks(page)

    const today = new Date()
    const titleA = `Trail A ${randomString(5)}`
    const titleB = `Trail B ${randomString(5)}`

    const startA = new Date(today)
    startA.setHours(10, 0, 0, 0)
    const startB = new Date(today)
    startB.setHours(11, 30, 0, 0)

    const taskA = await createTask(page, {
      title: titleA,
      scheduled_start: toNaiveLocal(startA),
      duration: 60,
    })
    const taskB = await createTask(page, {
      title: titleB,
      scheduled_start: toNaiveLocal(startB),
      duration: 60,
    })

    // Complete both
    await toggleCompleted(page, taskA.id)
    await toggleCompleted(page, taskB.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for FullCalendar layout + trail drawing
    await page.waitForTimeout(1000)

    // Trail line should exist in the today column
    const todayCol = page.locator(".fc-timegrid-col.fc-day-today")
    const trailLine = todayCol.locator(".achievement-trail-line")
    await expect(trailLine.first()).toBeVisible({ timeout: 8000 })

    // Trail dot should exist
    const trailDot = todayCol.locator(
      ".achievement-trail-dot, .achievement-trail-dot-static",
    )
    await expect(trailDot.first()).toBeVisible({ timeout: 8000 })

    // Restore previously incomplete tasks
    for (const id of toggledIds) {
      await toggleCompleted(page, id)
    }
  })

  test("incomplete task between completed tasks breaks the trail chain", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Complete any existing incomplete tasks before our window
    const toggledIds = await completeAllTodayTasks(page)

    // Create 3 consecutive tasks: A (done), B (NOT done), C (done)
    // Chain should be [...earlier, A] and stop at B. C is not in the chain.
    const today = new Date()
    const titleA = `Chain Break A ${randomString(5)}`
    const titleB = `Chain Break B ${randomString(5)}`
    const titleC = `Chain Break C ${randomString(5)}`

    const startA = new Date(today)
    startA.setHours(10, 0, 0, 0)
    const startB = new Date(today)
    startB.setHours(11, 0, 0, 0)
    const startC = new Date(today)
    startC.setHours(12, 0, 0, 0)

    const taskA = await createTask(page, {
      title: titleA,
      scheduled_start: toNaiveLocal(startA),
      duration: 60,
    })
    await createTask(page, {
      title: titleB,
      scheduled_start: toNaiveLocal(startB),
      duration: 60,
    })
    const taskC = await createTask(page, {
      title: titleC,
      scheduled_start: toNaiveLocal(startC),
      duration: 60,
    })

    // Only complete A and C, leave B incomplete
    await toggleCompleted(page, taskA.id)
    await toggleCompleted(page, taskC.id)

    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    // A should have fc-event-done (React-applied) and eventually fc-event-completed
    // (drawTrails styles it as part of the chain from top)
    const eventA = page.locator(".fc-event").filter({ hasText: titleA })
    await expect(eventA).toHaveClass(/fc-event-done/, { timeout: 5000 })
    await expect(eventA).toHaveClass(/fc-event-completed/, { timeout: 5000 })

    // B should NOT be completed
    const eventB = page.locator(".fc-event").filter({ hasText: titleB })
    await expect(eventB).not.toHaveClass(/fc-event-done/)

    // C has fc-event-done from React but should NOT get fc-event-completed
    // because B breaks the chain — drawTrails never reaches C on today
    const eventC = page.locator(".fc-event").filter({ hasText: titleC })
    await expect(eventC).toHaveClass(/fc-event-done/)
    await expect(eventC).not.toHaveClass(/fc-event-completed/)

    for (const id of toggledIds) {
      await toggleCompleted(page, id)
    }
  })

  test("older day completed events have static trails (no animation classes)", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Create tasks on yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const titleA = `Yesterday A ${randomString(5)}`
    const titleB = `Yesterday B ${randomString(5)}`

    const startA = new Date(yesterday)
    startA.setHours(10, 0, 0, 0)
    const startB = new Date(yesterday)
    startB.setHours(12, 0, 0, 0)

    const taskA = await createTask(page, {
      title: titleA,
      scheduled_start: toNaiveLocal(startA),
      duration: 60,
    })
    const taskB = await createTask(page, {
      title: titleB,
      scheduled_start: toNaiveLocal(startB),
      duration: 60,
    })

    await toggleCompleted(page, taskA.id)
    await toggleCompleted(page, taskB.id)

    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(300)

    // Yesterday's events should have fc-event-completed immediately (from React)
    const eventA = page.locator(".fc-event").filter({ hasText: titleA })
    const eventB = page.locator(".fc-event").filter({ hasText: titleB })
    await expect(eventA).toBeVisible({ timeout: 8000 })
    await expect(eventB).toBeVisible({ timeout: 8000 })
    await expect(eventA).toHaveClass(/fc-event-completed/)
    await expect(eventB).toHaveClass(/fc-event-completed/)

    // Trail lines on non-today columns should have inline animation:none (static)
    const yesterdayDate = yesterday.toISOString().split("T")[0]
    const yesterdayCol = page.locator(
      `.fc-timegrid-col[data-date="${yesterdayDate}"]`,
    )
    const trailLines = yesterdayCol.locator(".achievement-trail-line")

    if ((await trailLines.count()) > 0) {
      // Static lines should have clip-path: none and animation: none (or its expanded form)
      const style = await trailLines.first().getAttribute("style")
      expect(style).toContain("clip-path: none")
      // Browser may expand "animation: none" to longhand; check either form
      expect(style).toMatch(/animation:\s*(none|auto)/)
    }
  })

  test("today trails animate with clip-path reveal (not instant)", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const toggledIds = await completeAllTodayTasks(page)

    const today = new Date()
    const titleA = `Anim A ${randomString(5)}`
    const titleB = `Anim B ${randomString(5)}`

    const startA = new Date(today)
    startA.setHours(10, 0, 0, 0)
    const startB = new Date(today)
    startB.setHours(12, 0, 0, 0)

    const taskA = await createTask(page, {
      title: titleA,
      scheduled_start: toNaiveLocal(startA),
      duration: 60,
    })
    const taskB = await createTask(page, {
      title: titleB,
      scheduled_start: toNaiveLocal(startB),
      duration: 60,
    })

    await toggleCompleted(page, taskA.id)
    await toggleCompleted(page, taskB.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    // Check immediately after reload — today's trail should have animation properties
    // (not animation: none like static trails)
    await page.waitForTimeout(200)

    const todayCol = page.locator(".fc-timegrid-col.fc-day-today")
    const trailLines = todayCol.locator(".achievement-trail-line")
    await expect(trailLines.first()).toBeVisible({ timeout: 5000 })

    const style = await trailLines.first().getAttribute("style")
    // Animated lines have animation-duration set, NOT animation: none
    expect(style).toContain("animation-duration")
    expect(style).not.toContain("animation: none")

    for (const id of toggledIds) {
      await toggleCompleted(page, id)
    }
  })

  test("today completed events use fc-event-done from React, fc-event-completed from drawTrails", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const toggledIds = await completeAllTodayTasks(page)

    const today = new Date()
    const titleA = `Cascade A ${randomString(5)}`
    const titleB = `Cascade B ${randomString(5)}`

    const startA = new Date(today)
    startA.setHours(10, 0, 0, 0)
    const startB = new Date(today)
    startB.setHours(12, 0, 0, 0)

    const taskA = await createTask(page, {
      title: titleA,
      scheduled_start: toNaiveLocal(startA),
      duration: 60,
    })
    const taskB = await createTask(page, {
      title: titleB,
      scheduled_start: toNaiveLocal(startB),
      duration: 60,
    })

    // Complete both
    await toggleCompleted(page, taskA.id)
    await toggleCompleted(page, taskB.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    const eventA = page.locator(".fc-event").filter({ hasText: titleA })
    const eventB = page.locator(".fc-event").filter({ hasText: titleB })
    await expect(eventA).toBeVisible({ timeout: 8000 })
    await expect(eventB).toBeVisible({ timeout: 8000 })

    // Both today events should have fc-event-done (React-applied data marker)
    await expect(eventA).toHaveClass(/fc-event-done/)
    await expect(eventB).toHaveClass(/fc-event-done/)

    // After animation completes, both should eventually get fc-event-completed
    await expect(eventA).toHaveClass(/fc-event-completed/, { timeout: 5000 })
    await expect(eventB).toHaveClass(/fc-event-completed/, { timeout: 5000 })

    for (const id of toggledIds) {
      await toggleCompleted(page, id)
    }
  })

  test("trail between three completed events creates at least two line segments", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Complete any existing incomplete tasks before our test window
    const toggledIds = await completeAllTodayTasks(page)

    const today = new Date()
    const titleA = `Triple A ${randomString(5)}`
    const titleB = `Triple B ${randomString(5)}`
    const titleC = `Triple C ${randomString(5)}`

    const startA = new Date(today)
    startA.setHours(10, 0, 0, 0)
    const startB = new Date(today)
    startB.setHours(11, 30, 0, 0)
    const startC = new Date(today)
    startC.setHours(13, 0, 0, 0)

    const taskA = await createTask(page, {
      title: titleA,
      scheduled_start: toNaiveLocal(startA),
      duration: 60,
    })
    const taskB = await createTask(page, {
      title: titleB,
      scheduled_start: toNaiveLocal(startB),
      duration: 60,
    })
    const taskC = await createTask(page, {
      title: titleC,
      scheduled_start: toNaiveLocal(startC),
      duration: 60,
    })

    await toggleCompleted(page, taskA.id)
    await toggleCompleted(page, taskB.id)
    await toggleCompleted(page, taskC.id)

    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for all animations to complete
    await page.waitForTimeout(3000)

    const todayCol = page.locator(".fc-timegrid-col.fc-day-today")
    const trailLines = todayCol.locator(".achievement-trail-line")
    const trailDots = todayCol.locator(
      ".achievement-trail-dot, .achievement-trail-dot-static",
    )

    // At least 2 line segments (A→B and B→C) and 2 dots
    // (may be more if existing completed tasks are in the chain)
    expect(await trailLines.count()).toBeGreaterThanOrEqual(2)
    expect(await trailDots.count()).toBeGreaterThanOrEqual(2)

    // Restore previously incomplete tasks
    for (const id of toggledIds) {
      await toggleCompleted(page, id)
    }
  })
})
