import { type Page, expect, test } from "@playwright/test"
import { randomString } from "./utils/random"

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
