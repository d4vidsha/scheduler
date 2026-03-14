import { type Page, expect, test } from "@playwright/test"
import { randomString } from "./utils/random"

// --- Phase 2: scheduling and working hours tests ---

test.describe("Phase 2 features", () => {
  test("schedule runs after task create", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskTitle = `Meeting ${randomString(5)}`
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0)

    // Create task via API with a due date and duration so the scheduler can place it
    const token = await page.evaluate(() => localStorage.getItem("access_token"))
    const response = await page.request.post("http://localhost:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: taskTitle, due: tomorrow.toISOString(), duration: 60 },
    })
    expect(response.ok()).toBeTruthy()
    const created = await response.json()

    // Trigger scheduling
    const scheduleResponse = await page.request.post("http://localhost:8000/api/v1/tasks/schedule", {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(scheduleResponse.ok()).toBeTruthy()

    // Fetch the task and verify scheduled_start is set
    const tasksResponse = await page.request.get("http://localhost:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(tasksResponse.ok()).toBeTruthy()
    const tasks = await tasksResponse.json()
    const scheduledTask = tasks.data.find((t: { id: string }) => t.id === created.id)
    expect(scheduledTask).toBeDefined()
    expect(scheduledTask.scheduled_start).not.toBeNull()
  })

  test("working hours displayed in settings", async ({ page }) => {
    await page.goto("/settings")
    await page.waitForLoadState("networkidle")

    // Navigate to Working Hours tab
    await page.getByRole("tab", { name: "Working Hours" }).click()

    // The section heading should be visible
    await expect(page.getByText("Working Hours", { exact: true }).first()).toBeVisible()

    // The work-start select should exist with default value 9
    const workStart = page.locator("#work-start")
    await expect(workStart).toBeVisible()
    await expect(workStart).toHaveValue("9")

    // The work-end select should exist with default value 18
    const workEnd = page.locator("#work-end")
    await expect(workEnd).toBeVisible()
    await expect(workEnd).toHaveValue("18")
  })
})

// Find the task item root by title text.
// Uses data-testid="task-item" for reliable targeting regardless of DOM depth.
const getTaskItem = (page: Page, title: string) =>
  page.locator('[data-testid="task-item"]').filter({ hasText: title })

test.describe("Tasks", () => {
  test("should create and display tasks", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Test Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(getTaskItem(page, taskTitle)).toBeVisible()
  })

  test("should strip @tag from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Tag Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} @work`)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(getTaskItem(page, baseTitle)).toBeVisible()
    await expect(page.locator("p", { hasText: `${baseTitle} @work` })).not.toBeVisible()
  })

  test("should strip priority token from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Priority Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} p1`)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(getTaskItem(page, baseTitle)).toBeVisible()
    await expect(page.locator("p", { hasText: `${baseTitle} p1` })).not.toBeVisible()
  })

  test("should strip date token from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Date Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} tuesday`)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(getTaskItem(page, baseTitle)).toBeVisible()
    await expect(page.locator("p", { hasText: `${baseTitle} tuesday` })).not.toBeVisible()
  })

  test("should strip all natural language tokens combined", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `NL Task ${randomString(5)}`
    await page
      .getByPlaceholder(/Task title/)
      .fill(`${baseTitle} @work p2 monday`)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(getTaskItem(page, baseTitle)).toBeVisible()
    await expect(page.locator("p", { hasText: `${baseTitle} @work p2 monday` })).not.toBeVisible()
  })

  test("should submit on Enter key", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Enter Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByPlaceholder(/Task title/).press("Enter")

    await expect(getTaskItem(page, taskTitle)).toBeVisible()
  })

  test("should toggle task completion status", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Toggle Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, taskTitle)
    await expect(taskItem).toBeVisible()

    // First button in the task item is the completion toggle
    await taskItem.getByRole("button").first().click()
    await expect(taskItem.locator("p")).toHaveClass(/line-through/)

    await taskItem.getByRole("button").first().click()
    await expect(taskItem.locator("p")).not.toHaveClass(/line-through/)
  })

  test("should delete a task", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Delete Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, taskTitle)
    await expect(taskItem).toBeVisible()

    await taskItem.hover()
    page.once("dialog", (dialog) => dialog.accept())
    await taskItem.locator('button[aria-label="Delete task"]').click()

    await expect(taskItem).not.toBeVisible({ timeout: 5000 })
  })

  // --- Metadata display tests (new) ---

  test("should show priority dot for p1 task", async ({ page }) => {
    await page.goto("/tasks")

    // Use a base title with no parser tokens (no p1-p4, today, tomorrow, day names)
    const baseTitle = `Crimson Dot Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} p1`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(taskItem.locator('[data-testid="priority-dot"].text-red-500')).toBeVisible()
  })

  test("should show priority dot for p2 task", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Amber Dot Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} p2`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(taskItem.locator('[data-testid="priority-dot"].text-orange-400')).toBeVisible()
  })

  test("should show priority dot for p3 task", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Azure Dot Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} p3`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(taskItem.locator('[data-testid="priority-dot"].text-blue-400')).toBeVisible()
  })

  test("should show no priority dot for plain task", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Bare Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, taskTitle)
    await expect(taskItem).toBeVisible()
    await expect(taskItem.locator('[data-testid="priority-dot"]')).not.toBeAttached()
  })

  test("should show due date Today for task due today", async ({ page }) => {
    await page.goto("/tasks")

    // "Imminent Task" contains no parser tokens
    const baseTitle = `Imminent Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} today`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem.locator('[data-testid="task-meta"]').getByText("Today", { exact: true }),
    ).toBeVisible()
  })

  test("should show due date Tomorrow for task due tomorrow", async ({ page }) => {
    await page.goto("/tasks")

    // "Upcoming Task" contains no parser tokens
    const baseTitle = `Upcoming Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} tomorrow`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem.locator('[data-testid="task-meta"]').getByText("Tomorrow", { exact: true }),
    ).toBeVisible()
  })

  test("should show no task-meta row for plain task", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Plain Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, taskTitle)
    await expect(taskItem).toBeVisible()
    // TaskMeta renders null when no tags and no due date
    await expect(taskItem.locator('[data-testid="task-meta"]')).not.toBeAttached()
  })

  test("should show tag pill for task with tags", async ({ page }) => {
    await page.goto("/tasks")

    // Create via API to bypass mention dropdown complexity
    const baseTitle = `Grocery Task ${randomString(5)}`
    const token = await page.evaluate(() => localStorage.getItem("access_token"))
    const response = await page.request.post("http://localhost:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: baseTitle, tags: ["groceries"] },
    })
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem.locator('[data-testid="task-meta"]').getByText("groceries", { exact: true }),
    ).toBeVisible()
  })

  // --- Duration badge tests ---

  test("should show 1h duration badge for '1h' input", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Report Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} 1h`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem.locator('[data-testid="task-meta"]').getByText("1h", { exact: true }),
    ).toBeVisible()
  })

  test("should show '2h 30m' duration badge for '2h30m' input", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Deep Work Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} 2h30m`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem.locator('[data-testid="task-meta"]').getByText("2h 30m", { exact: true }),
    ).toBeVisible()
  })

  test("should show '30m' duration badge for '30m' input", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Quick Call Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} 30m`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem.locator('[data-testid="task-meta"]').getByText("30m", { exact: true }),
    ).toBeVisible()
  })

  test("should strip duration token from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Stripped Duration Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} 1h`)
    await page.getByRole("button", { name: "Add" }).click()

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    // The raw token should not appear in the title paragraph
    await expect(page.locator("p", { hasText: `${baseTitle} 1h` })).not.toBeVisible()
  })

  // --- Calendar all-day chip tests ---

  test("should show task with due date today as an all-day chip in the calendar", async ({ page }) => {
    await page.goto("/")

    const baseTitle = `Calendar Today Task ${randomString(5)}`
    // Create via API so we can set due precisely to today without relying on the parser route
    const token = await page.evaluate(() => localStorage.getItem("access_token"))
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const response = await page.request.post("http://localhost:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: baseTitle, due: today.toISOString() },
    })
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    // The calendar renders all-day chips in the desktop header as <span> elements with the task title
    // They live inside the right ResizablePanel that contains the WeekCalendar component
    const calendarPanel = page.locator('[data-panel-id]').last()
    await expect(calendarPanel.getByText(baseTitle, { exact: true })).toBeVisible({ timeout: 8000 })
  })

  test("should show task with due date tomorrow as an all-day chip in the calendar", async ({ page }) => {
    await page.goto("/")

    const baseTitle = `Calendar Tomorrow Task ${randomString(5)}`
    const token = await page.evaluate(() => localStorage.getItem("access_token"))
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0)
    const response = await page.request.post("http://localhost:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: baseTitle, due: tomorrow.toISOString() },
    })
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    // If tomorrow starts a new week (e.g. today is Saturday), navigate forward one week
    const todayDay = new Date().getDay() // 0=Sun, 6=Sat
    if (todayDay === 6) {
      // Saturday: tomorrow is Sunday, start of next week
      await page.getByRole("button", { name: "Next week" }).click()
      await page.waitForLoadState("networkidle")
    }

    const calendarPanel = page.locator('[data-panel-id]').last()
    await expect(calendarPanel.getByText(baseTitle, { exact: true })).toBeVisible({ timeout: 8000 })
  })

  test("should show combined metadata for task with tag, priority, and due date", async ({ page }) => {
    await page.goto("/tasks")

    // Create via API for reliable tag + priority + due combination
    const baseTitle = `Multi Meta Task ${randomString(5)}`
    const token = await page.evaluate(() => localStorage.getItem("access_token"))
    const due = new Date()
    due.setDate(due.getDate() + 1) // tomorrow
    const response = await page.request.post("http://localhost:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: baseTitle, tags: ["work"], priority_id: 2, due: due.toISOString() },
    })
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(taskItem.locator('[data-testid="priority-dot"].text-orange-400')).toBeVisible()
    await expect(
      taskItem.locator('[data-testid="task-meta"]').getByText("work", { exact: true }),
    ).toBeVisible()
    await expect(
      taskItem.locator('[data-testid="task-meta"]').getByText("Tomorrow", { exact: true }),
    ).toBeVisible()
  })
})
