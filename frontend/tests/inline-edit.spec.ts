import { expect, test } from "@playwright/test"

const MOCK_TASKS = {
  data: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      title: "First task",
      description: "Some notes",
      priority_id: null,
      duration: 30,
      due: null,
      scheduled_start: null,
      completed: false,
      position: 1,
      tags: null,
      owner_id: "00000000-0000-0000-0000-000000000000",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      title: "Second task",
      description: null,
      priority_id: null,
      duration: 60,
      due: null,
      scheduled_start: null,
      completed: false,
      position: 2,
      tags: null,
      owner_id: "00000000-0000-0000-0000-000000000000",
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      title: "Third task",
      description: null,
      priority_id: null,
      duration: null,
      due: "2026-03-25T17:00:00",
      scheduled_start: null,
      completed: false,
      position: 3,
      tags: null,
      owner_id: "00000000-0000-0000-0000-000000000000",
    },
  ],
  count: 3,
}

function setupMockTasks(page: import("@playwright/test").Page) {
  return page.route("**/api/v1/tasks/?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_TASKS),
    }),
  )
}

test.describe("Inline task editing", () => {
  test("double-click opens inline edit form", async ({ page }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await expect(taskItem).toBeVisible()

    // Double-click to open inline edit
    await taskItem.dblclick()

    // Inline edit form should appear
    const editForm = page.getByTestId("inline-edit-form")
    await expect(editForm).toBeVisible({ timeout: 3000 })

    // Title input should be visible with the task's title
    const titleInput = page.getByTestId("inline-edit-title")
    await expect(titleInput).toBeVisible()
    await expect(titleInput).toHaveValue("First task")

    // Notes textarea should be visible
    const notesInput = page.getByTestId("inline-edit-notes")
    await expect(notesInput).toBeVisible()
    await expect(notesInput).toHaveValue("Some notes")
  })

  test("inline edit form is interactive — inputs accept text", async ({
    page,
  }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await taskItem.dblclick()

    const titleInput = page.getByTestId("inline-edit-title")
    await expect(titleInput).toBeVisible({ timeout: 3000 })

    // Clear and type new title
    await titleInput.fill("Updated title")
    await expect(titleInput).toHaveValue("Updated title")

    // Type in notes
    const notesInput = page.getByTestId("inline-edit-notes")
    await notesInput.fill("New notes content")
    await expect(notesInput).toHaveValue("New notes content")
  })

  test("pressing Enter saves and closes inline edit", async ({ page }) => {
    await setupMockTasks(page)
    // Intercept the update API call
    let updatePayload: Record<string, unknown> | null = null
    await page.route("**/api/v1/tasks/11111111-*", (route) => {
      if (route.request().method() === "PUT") {
        updatePayload = route.request().postDataJSON()
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_TASKS.data[0],
            ...updatePayload,
          }),
        })
      }
      return route.continue()
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await taskItem.dblclick()

    const titleInput = page.getByTestId("inline-edit-title")
    await expect(titleInput).toBeVisible({ timeout: 3000 })

    await titleInput.fill("Renamed task")
    await titleInput.press("Enter")

    // Form should close
    await expect(page.getByTestId("inline-edit-form")).not.toBeAttached({
      timeout: 3000,
    })

    // API should have been called with the new title
    expect(updatePayload).toBeTruthy()
    expect((updatePayload as Record<string, unknown>)?.title).toBe(
      "Renamed task",
    )
  })

  test("pressing Escape saves and closes inline edit", async ({ page }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await taskItem.dblclick()

    const titleInput = page.getByTestId("inline-edit-title")
    await expect(titleInput).toBeVisible({ timeout: 3000 })

    await titleInput.press("Escape")

    // Form should close
    await expect(page.getByTestId("inline-edit-form")).not.toBeAttached({
      timeout: 3000,
    })
  })

  test("clicking outside saves and closes inline edit", async ({ page }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await taskItem.dblclick()

    await expect(page.getByTestId("inline-edit-form")).toBeVisible({
      timeout: 3000,
    })

    // Click outside — on the calendar area
    await page.locator("header").click()

    // Form should close
    await expect(page.getByTestId("inline-edit-form")).not.toBeAttached({
      timeout: 3000,
    })
  })

  test("only one task can be edited at a time", async ({ page }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Double-click first task
    const firstTask = page.getByTestId("task-item").filter({ hasText: "First task" })
    await firstTask.dblclick()

    await expect(page.getByTestId("inline-edit-form")).toBeVisible({
      timeout: 3000,
    })
    await expect(page.getByTestId("inline-edit-title")).toHaveValue(
      "First task",
    )

    // Double-click second task
    const secondTask = page
      .getByTestId("task-item")
      .filter({ hasText: "Second task" })
    await secondTask.dblclick()

    // Should only have one edit form open
    await expect(page.getByTestId("inline-edit-form")).toHaveCount(1, {
      timeout: 3000,
    })
    await expect(page.getByTestId("inline-edit-title")).toHaveValue(
      "Second task",
    )
  })

  test("single click does not open inline edit", async ({ page }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await taskItem.click()

    // Wait briefly to make sure nothing opens
    await page.waitForTimeout(500)

    // No inline edit form should appear
    await expect(page.getByTestId("inline-edit-form")).not.toBeAttached()
  })

  test("task with due date shows date label in edit form", async ({
    page,
  }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Third task has a due date
    const taskItem = page.getByTestId("task-item").filter({ hasText: "Third task" })
    await taskItem.dblclick()

    const editForm = page.getByTestId("inline-edit-form")
    await expect(editForm).toBeVisible({ timeout: 3000 })

    // Should show the due date label (Today or the formatted date)
    await expect(editForm.getByText(/Today|Mar/)).toBeVisible()
  })

  test("task without due date shows 'No date' in edit form", async ({
    page,
  }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await taskItem.dblclick()

    const editForm = page.getByTestId("inline-edit-form")
    await expect(editForm).toBeVisible({ timeout: 3000 })

    await expect(editForm.getByText("No date")).toBeVisible()
  })

  test("edit form has action buttons (tag, checklist, flag)", async ({
    page,
  }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await taskItem.dblclick()

    const editForm = page.getByTestId("inline-edit-form")
    await expect(editForm).toBeVisible({ timeout: 3000 })

    // Check action icons are present
    await expect(editForm.getByText("sell")).toBeVisible()
    await expect(editForm.getByText("checklist")).toBeVisible()
    await expect(editForm.getByText("flag")).toBeVisible()
  })

  test("title input is clickable and focusable via pointer", async ({
    page,
  }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page
      .getByTestId("task-item")
      .filter({ hasText: "First task" })
    await taskItem.dblclick()

    const titleInput = page.getByTestId("inline-edit-title")
    await expect(titleInput).toBeVisible({ timeout: 3000 })

    // Use dispatchEvent to simulate a real pointer click (not Playwright's .click())
    // This better replicates what a real user does
    const box = await titleInput.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

    // Input should be focused after pointer click
    await expect(titleInput).toBeFocused()

    // Type via keyboard to verify the input actually received focus
    await page.keyboard.type("X")
    await expect(titleInput).toHaveValue("First taskX")
  })

  test("notes textarea is clickable and focusable via pointer", async ({
    page,
  }) => {
    await setupMockTasks(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page
      .getByTestId("task-item")
      .filter({ hasText: "First task" })
    await taskItem.dblclick()

    const notesInput = page.getByTestId("inline-edit-notes")
    await expect(notesInput).toBeVisible({ timeout: 3000 })

    // Wait for layout animation to settle before clicking
    await page.waitForTimeout(400)

    const box = await notesInput.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

    await expect(notesInput).toBeFocused()
    await page.keyboard.type("typed via pointer")
    await expect(notesInput).toHaveValue("Some notestyped via pointer")
  })

  test("description change triggers API update", async ({ page }) => {
    await setupMockTasks(page)

    let updatePayload: Record<string, unknown> | null = null
    await page.route("**/api/v1/tasks/11111111-*", (route) => {
      if (route.request().method() === "PUT") {
        updatePayload = route.request().postDataJSON()
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_TASKS.data[0],
            ...updatePayload,
          }),
        })
      }
      return route.continue()
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const taskItem = page.getByTestId("task-item").filter({ hasText: "First task" })
    await taskItem.dblclick()

    const notesInput = page.getByTestId("inline-edit-notes")
    await expect(notesInput).toBeVisible({ timeout: 3000 })

    await notesInput.fill("Updated notes")
    await page.getByTestId("inline-edit-title").press("Enter")

    // Wait for form to close
    await expect(page.getByTestId("inline-edit-form")).not.toBeAttached({
      timeout: 3000,
    })

    expect(updatePayload).toBeTruthy()
    expect((updatePayload as Record<string, unknown>)?.description).toBe(
      "Updated notes",
    )
  })
})
