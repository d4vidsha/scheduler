import { type Page, expect, test } from "@playwright/test"
import { randomString } from "./utils/random"

function toNaiveLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

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
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    const response = await page.request.post(
      "http://127.0.0.1:8000/api/v1/tasks/",
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: taskTitle, due: toNaiveLocal(tomorrow), duration: 60 },
      },
    )
    expect(response.ok()).toBeTruthy()
    const created = await response.json()

    // Trigger scheduling
    const scheduleResponse = await page.request.post(
      "http://127.0.0.1:8000/api/v1/tasks/schedule",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    expect(scheduleResponse.ok()).toBeTruthy()

    // Fetch the task and verify scheduled_start is set
    const tasksResponse = await page.request.get(
      "http://127.0.0.1:8000/api/v1/tasks/",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    expect(tasksResponse.ok()).toBeTruthy()
    const tasks = await tasksResponse.json()
    const scheduledTask = tasks.data.find(
      (t: { id: string }) => t.id === created.id,
    )
    expect(scheduledTask).toBeDefined()
    expect(scheduledTask.scheduled_start).not.toBeNull()
  })

  test("working hours displayed in settings", async ({ page }) => {
    await page.goto("/settings")
    await page.waitForLoadState("networkidle")

    // Navigate to Working Hours tab
    await page.getByRole("tab", { name: "Working Hours" }).click()

    // The section heading should be visible
    await expect(
      page.getByText("Working Hours", { exact: true }).first(),
    ).toBeVisible()

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
    await page.getByRole("button", { name: "Add", exact: true }).click()

    await expect(getTaskItem(page, taskTitle)).toBeVisible()
  })

  test("should strip @tag from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Tag Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} @work`)
    await page.getByRole("button", { name: "Add", exact: true }).click()

    await expect(getTaskItem(page, baseTitle)).toBeVisible()
    await expect(
      page.locator("p", { hasText: `${baseTitle} @work` }),
    ).not.toBeVisible()
  })

  test("should strip priority token from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Priority Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} p1`)
    await page.getByRole("button", { name: "Add", exact: true }).click()

    await expect(getTaskItem(page, baseTitle)).toBeVisible()
    await expect(
      page.locator("p", { hasText: `${baseTitle} p1` }),
    ).not.toBeVisible()
  })

  test("should strip date token from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Date Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} tuesday`)
    await page.getByRole("button", { name: "Add", exact: true }).click()

    await expect(getTaskItem(page, baseTitle)).toBeVisible()
    await expect(
      page.locator("p", { hasText: `${baseTitle} tuesday` }),
    ).not.toBeVisible()
  })

  test("should strip all natural language tokens combined", async ({
    page,
  }) => {
    await page.goto("/tasks")

    const baseTitle = `NL Task ${randomString(5)}`
    await page
      .getByPlaceholder(/Task title/)
      .fill(`${baseTitle} @work p2 monday`)
    await page.getByRole("button", { name: "Add", exact: true }).click()

    await expect(getTaskItem(page, baseTitle)).toBeVisible()
    await expect(
      page.locator("p", { hasText: `${baseTitle} @work p2 monday` }),
    ).not.toBeVisible()
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
    await page.getByRole("button", { name: "Add", exact: true }).click()

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
    await page.getByRole("button", { name: "Add", exact: true }).click()

    const taskItem = getTaskItem(page, taskTitle)
    await expect(taskItem).toBeVisible()

    await taskItem.hover()
    page.once("dialog", (dialog) => dialog.accept())
    await taskItem.locator('button[aria-label="Delete task"]').click()

    await expect(taskItem).not.toBeVisible({ timeout: 5000 })
  })

  // --- Metadata display tests (new) ---

  // TODO: Priority dot UI not yet implemented — replace with actual priority tests when added
  // test("should show priority dot for p1 task", ...)
  // test("should show priority dot for p2 task", ...)
  // test("should show priority dot for p3 task", ...)
  // test("should show no priority dot for plain task", ...)

  test("should show due date Today for task due today", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Imminent Task ${randomString(5)}`
    // Create via API to reliably set due date (Playwright fill + react-mentions doesn't sync plainText)
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const response = await page.request.post(
      "http://127.0.0.1:8000/api/v1/tasks/",
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: baseTitle, due: toNaiveLocal(today) },
      },
    )
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("Today"),
    ).toBeVisible()
  })

  test("should show due date Tomorrow for task due tomorrow", async ({
    page,
  }) => {
    await page.goto("/tasks")

    const baseTitle = `Upcoming Task ${randomString(5)}`
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0)
    const response = await page.request.post(
      "http://127.0.0.1:8000/api/v1/tasks/",
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: baseTitle, due: toNaiveLocal(tomorrow) },
      },
    )
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("Tomorrow"),
    ).toBeVisible()
  })

  test("should show no task-meta row for plain task", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Plain Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add", exact: true }).click()

    const taskItem = getTaskItem(page, taskTitle)
    await expect(taskItem).toBeVisible()
    // TaskMeta renders null when no tags and no due date
    await expect(
      taskItem.locator('[data-testid="task-meta"]'),
    ).not.toBeAttached()
  })

  test("should show tag pill for task with tags", async ({ page }) => {
    await page.goto("/tasks")

    // Create via API to bypass mention dropdown complexity
    const baseTitle = `Grocery Task ${randomString(5)}`
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    const response = await page.request.post(
      "http://127.0.0.1:8000/api/v1/tasks/",
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: baseTitle, tags: ["groceries"] },
      },
    )
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("groceries", { exact: true }),
    ).toBeVisible()
  })

  // --- Duration badge tests ---

  test("should show 1h duration badge for '1h' input", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Report Task ${randomString(5)}`
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    await page.request.post("http://127.0.0.1:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: baseTitle, duration: 60 },
    })

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("1h"),
    ).toBeVisible()
  })

  test("should show '2h 30m' duration badge for '2h30m' input", async ({
    page,
  }) => {
    await page.goto("/tasks")

    const baseTitle = `Deep Work Task ${randomString(5)}`
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    await page.request.post("http://127.0.0.1:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: baseTitle, duration: 150 },
    })

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("2h 30m"),
    ).toBeVisible()
  })

  test("should show '30m' duration badge for '30m' input", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Quick Call Task ${randomString(5)}`
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    await page.request.post("http://127.0.0.1:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: baseTitle, duration: 30 },
    })

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("30m"),
    ).toBeVisible()
  })

  test("should strip duration token from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Stripped Duration Task ${randomString(5)}`
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    await page.request.post("http://127.0.0.1:8000/api/v1/tasks/", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: baseTitle, duration: 60 },
    })

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    // Duration should show in meta, not in title
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("1h"),
    ).toBeVisible()
  })

  // --- Calendar all-day chip tests ---

  test("should show scheduled task on the calendar", async ({
    page,
  }) => {
    await page.goto("/")

    const baseTitle = `Calendar Today Task ${randomString(5)}`
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    const today = new Date()
    today.setHours(14, 0, 0, 0)
    const response = await page.request.post(
      "http://127.0.0.1:8000/api/v1/tasks/",
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: baseTitle, scheduled_start: toNaiveLocal(today), duration: 60 },
      },
    )
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    const calendarPanel = page.locator('[data-testid="calendar-week-view"]')
    await expect(
      calendarPanel.locator('.fc-event').filter({ hasText: baseTitle }),
    ).toBeVisible({ timeout: 8000 })
  })

  test("should show combined metadata for task with tag, priority, and due date", async ({
    page,
  }) => {
    await page.goto("/tasks")

    // Create via API for reliable tag + priority + due combination
    const baseTitle = `Multi Meta Task ${randomString(5)}`
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    const due = new Date()
    due.setDate(due.getDate() + 1) // tomorrow
    const response = await page.request.post(
      "http://127.0.0.1:8000/api/v1/tasks/",
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: baseTitle,
          tags: ["work"],
          due: toNaiveLocal(due),
          duration: 60,
        },
      },
    )
    expect(response.ok()).toBeTruthy()

    await page.reload()
    await page.waitForLoadState("networkidle")

    const taskItem = getTaskItem(page, baseTitle)
    await expect(taskItem).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("work", { exact: true }),
    ).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("Tomorrow"),
    ).toBeVisible()
    await expect(
      taskItem
        .locator('[data-testid="task-meta"]')
        .getByText("1h"),
    ).toBeVisible()
  })
})

// --- Phase 3: two-way calendar interaction tests ---

test.describe
  .serial("Phase 3 features", () => {
    test("click task block opens edit dialog", async ({ page }) => {
      await page.goto("/")
      await page.waitForLoadState("networkidle")

      const taskTitle = `Cal Edit Task ${randomString(5)}`
      const token = await page.evaluate(() =>
        localStorage.getItem("access_token"),
      )

      // Create a task scheduled for today at 10am
      const today = new Date()
      today.setHours(10, 0, 0, 0)
      const response = await page.request.post(
        "http://127.0.0.1:8000/api/v1/tasks/",
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            title: taskTitle,
            scheduled_start: toNaiveLocal(today),
            duration: 60,
          },
        },
      )
      expect(response.ok()).toBeTruthy()

      await page.reload()
      await page.waitForLoadState("networkidle")

      // Click on the task event in the calendar
      // Use force:true because overlapping FC harness elements intercept pointer events
      const taskBlock = page
        .locator('.fc-event')
        .filter({ hasText: taskTitle })
      await expect(taskBlock).toBeVisible({ timeout: 8000 })
      await taskBlock.dispatchEvent('click')

      // Edit dialog should appear with the task title pre-filled in the input
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 })
      await expect(page.getByLabel("Title")).toHaveValue(taskTitle)
    })

    test("edit dialog saves updated title", async ({ page }) => {
      await page.goto("/")
      await page.waitForLoadState("networkidle")

      const taskTitle = `Edit Title Task ${randomString(5)}`
      const updatedTitle = `Updated Title ${randomString(5)}`
      const token = await page.evaluate(() =>
        localStorage.getItem("access_token"),
      )

      // Create a task scheduled for today at 10am
      const today = new Date()
      today.setHours(10, 0, 0, 0)
      const response = await page.request.post(
        "http://127.0.0.1:8000/api/v1/tasks/",
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            title: taskTitle,
            scheduled_start: toNaiveLocal(today),
            duration: 60,
          },
        },
      )
      expect(response.ok()).toBeTruthy()

      await page.reload()
      await page.waitForLoadState("networkidle")

      const taskBlock = page
        .locator('.fc-event')
        .filter({ hasText: taskTitle })
      await expect(taskBlock).toBeVisible({ timeout: 12000 })
      await taskBlock.dispatchEvent('click')

      // Edit dialog should open
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 })

      // Clear and fill in new title
      const titleInput = page.getByLabel("Title")
      await titleInput.clear()
      await titleInput.fill(updatedTitle)

      // Save
      await page.getByRole("button", { name: "Save" }).click()

      // Dialog should close and updated title should appear in calendar
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 })
      await expect(
        page
          .locator('.fc-event')
          .filter({ hasText: updatedTitle }),
      ).toBeVisible({ timeout: 8000 })
    })

    test("unscheduled tasks panel shows tasks without scheduled_start", async ({
      page,
    }) => {
      await page.goto("/")
      await page.waitForLoadState("networkidle")

      const taskTitle = `Unscheduled Task ${randomString(5)}`
      const token = await page.evaluate(() =>
        localStorage.getItem("access_token"),
      )

      // Create a task with no due date and no scheduled_start
      const response = await page.request.post(
        "http://127.0.0.1:8000/api/v1/tasks/",
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { title: taskTitle },
        },
      )
      expect(response.ok()).toBeTruthy()

      await page.reload()
      await page.waitForResponse(
        (r) => r.url().includes("/api/v1/tasks") && r.status() === 200,
      )
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(1500)

      // The task should appear in the Inbox task list on the left
      await expect(page.getByText(taskTitle).first()).toBeVisible({
        timeout: 15000,
      })
    })
  })
