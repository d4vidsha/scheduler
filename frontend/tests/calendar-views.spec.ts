import { expect, test } from "@playwright/test"

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
    // Intercept the tasks API to return an empty list instead of deleting real data.
    // Deleting all tasks would race with parallel tests that create/read tasks.
    await page.route("**/api/v1/tasks/?**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], count: 0 }),
      }),
    )

    await page.goto("/")
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
