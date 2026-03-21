import { expect, test } from "@playwright/test"
import { randomString } from "./utils/random"

// Helper: format a Date as naive local ISO string (no timezone offset or Z suffix)
function toNaiveLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Helper: get an auth token from the page's localStorage
async function getToken(page: import("@playwright/test").Page) {
  return page.evaluate(() => localStorage.getItem("access_token"))
}

// Helper: create a task via API
async function createTask(
  page: import("@playwright/test").Page,
  data: Record<string, unknown>,
) {
  const token = await getToken(page)
  const response = await page.request.post(
    "http://127.0.0.1:8000/api/v1/tasks/",
    {
      headers: { Authorization: `Bearer ${token}` },
      data,
    },
  )
  expect(response.ok()).toBeTruthy()
  return response.json()
}

// --- View Switcher ---

test.describe("Calendar view switcher", () => {
  test("defaults to week view", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await expect(
      page.locator('[data-testid="calendar-week-view"]'),
    ).toBeVisible()
  })

  test("switches to day view", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: "Day", exact: true }).click()
    await expect(
      page.locator('[data-testid="calendar-day-view"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="calendar-week-view"]'),
    ).not.toBeAttached()
  })

  test("switches to month view", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: "Month" }).click()
    await expect(
      page.locator('[data-testid="calendar-month-view"]'),
    ).toBeVisible()
  })

  test("switches to year view", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: "Year" }).click()
    await expect(
      page.locator('[data-testid="calendar-year-view"]'),
    ).toBeVisible()
  })
})

// --- Day View ---

test.describe("Day view", () => {
  test("shows a task scheduled for today", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskTitle = `Day View Task ${randomString(5)}`
    const today = new Date()
    today.setHours(10, 0, 0, 0)
    await createTask(page, {
      title: taskTitle,
      scheduled_start: toNaiveLocal(today),
      duration: 60,
    })

    // Switch to day view and reload to pick up the new task
    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: "Day", exact: true }).click()

    // FullCalendar renders events as .fc-event elements
    const block = page.locator(".fc-event").filter({ hasText: taskTitle })
    await expect(block).toBeVisible({ timeout: 8000 })
  })
})

// --- Month View ---

test.describe("Month view", () => {
  test("shows task on the correct day", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskTitle = `Month Chip ${randomString(5)}`
    const today = new Date()
    today.setHours(10, 0, 0, 0)
    await createTask(page, {
      title: taskTitle,
      scheduled_start: toNaiveLocal(today),
      duration: 30,
    })

    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: "Month" }).click()

    await expect(
      page.locator('[data-testid="calendar-month-view"]'),
    ).toBeVisible()
    // The event may be behind a "+more" popover — click it if present
    const moreLink = page
      .locator('[data-testid="calendar-month-view"]')
      .locator(".fc-more-link, .fc-daygrid-more-link")
      .first()
    if (await moreLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moreLink.click()
    }
    await expect(
      page.getByText(taskTitle).first(),
    ).toBeVisible({ timeout: 8000 })
  })

  test("shows +more when exceeding dayMaxEvents", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const today = new Date()
    // Create 4 tasks on the same day
    for (let i = 0; i < 4; i++) {
      const start = new Date(today)
      start.setHours(9 + i, 0, 0, 0)
      await createTask(page, {
        title: `Overflow ${i} ${randomString(4)}`,
        scheduled_start: toNaiveLocal(start),
        duration: 30,
      })
    }

    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: "Month" }).click()

    // FullCalendar shows a "+N more" link when dayMaxEvents is exceeded
    await expect(
      page
        .locator('[data-testid="calendar-month-view"]')
        .locator(".fc-more-link, .fc-daygrid-more-link")
        .first(),
    ).toBeVisible({ timeout: 8000 })
  })
})

// --- Year View ---

test.describe("Year view", () => {
  test("renders 12 months", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: "Year" }).click()
    await expect(
      page.locator('[data-testid="calendar-year-view"]'),
    ).toBeVisible()

    // All 12 month names should appear
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    for (const month of months) {
      await expect(
        page
          .locator('[data-testid="calendar-year-view"]')
          .getByText(month, { exact: true }),
      ).toBeVisible()
    }
  })

  test("clicking a month drills down to month view", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: "Year" }).click()
    await expect(
      page.locator('[data-testid="calendar-year-view"]'),
    ).toBeVisible()

    // Click March month header
    await page
      .locator('[data-testid="calendar-year-view"]')
      .getByText("March", { exact: true })
      .click()

    await expect(
      page.locator('[data-testid="calendar-month-view"]'),
    ).toBeVisible({ timeout: 5000 })
  })
})

// --- Auto-Schedule Button ---

test.describe("Auto-schedule button", () => {
  test("schedules unscheduled tasks with due dates", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskTitle = `Auto-Sched ${randomString(5)}`
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(17, 0, 0, 0)
    const created = await createTask(page, {
      title: taskTitle,
      due: toNaiveLocal(tomorrow),
      duration: 60,
    })

    // Click Auto-Schedule in the top bar
    await page.getByRole("button", { name: "Auto-Schedule" }).click()

    // Wait for the toast confirming success
    await expect(page.getByText("Tasks rescheduled successfully").first()).toBeVisible({
      timeout: 10000,
    })

    // Verify the task now has scheduled_start via API
    const token = await getToken(page)
    const resp = await page.request.get(
      `http://127.0.0.1:8000/api/v1/tasks/${created.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(resp.ok()).toBeTruthy()
    const task = await resp.json()
    expect(task.scheduled_start).not.toBeNull()
  })
})

// --- Conflict Detection ---

test.describe("Conflict detection", () => {
  test("shows conflict styling for overlapping tasks", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const today = new Date()
    today.setHours(11, 0, 0, 0)

    // Create two tasks at the same time
    await createTask(page, {
      title: `Conflict A ${randomString(4)}`,
      scheduled_start: toNaiveLocal(today),
      duration: 60,
    })
    await createTask(page, {
      title: `Conflict B ${randomString(4)}`,
      scheduled_start: toNaiveLocal(today),
      duration: 60,
    })

    await page.reload()
    await page.waitForLoadState("networkidle")

    // Both should show in week view with conflict CSS class
    const conflictEvents = page.locator(".fc-event-conflict")
    await expect(conflictEvents.first()).toBeVisible({ timeout: 8000 })
    expect(await conflictEvents.count()).toBeGreaterThanOrEqual(2)
  })
})

// --- Keyboard Shortcut ---

test.describe("Keyboard shortcut", () => {
  test("pressing N focuses the task input", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Press N key (not in any input)
    await page.keyboard.press("n")

    // The AddTaskForm input should be focused
    const input = page.getByPlaceholder(/Task title/)
    await expect(input).toBeFocused({ timeout: 3000 })
  })
})

// --- Empty State ---

test.describe("Empty state", () => {
  test("shows empty state when no tasks exist", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Delete all existing tasks via API
    const token = await getToken(page)
    const resp = await page.request.get(
      "http://127.0.0.1:8000/api/v1/tasks/?limit=500",
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const tasks = await resp.json()
    for (const task of tasks.data) {
      await page.request.delete(
        `http://127.0.0.1:8000/api/v1/tasks/${task.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
    }

    await page.reload()
    await page.waitForLoadState("networkidle")

    await expect(page.getByText("No tasks yet")).toBeVisible({
      timeout: 5000,
    })
  })
})

// --- Sidebar Navigation ---

test.describe("Sidebar", () => {
  test("sidebar is visible with brand and nav items", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const sidebar = page.locator("aside")

    // Brand name
    await expect(sidebar.getByText("Scheduler")).toBeVisible()

    // Nav items
    await expect(sidebar.getByText("Today", { exact: true })).toBeVisible()
    await expect(sidebar.getByText("Upcoming", { exact: true })).toBeVisible()
    await expect(sidebar.getByText("Projects", { exact: true })).toBeVisible()
    await expect(sidebar.getByText("Logbook", { exact: true })).toBeVisible()
  })

  test("Add New Task button opens dialog", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: "Add New Task" }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole("dialog").getByText("New Task")).toBeVisible()
  })
})
