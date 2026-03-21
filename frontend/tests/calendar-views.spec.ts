import { expect, test } from "@playwright/test"
import { randomString } from "./utils/random"

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
		"http://localhost:8000/api/v1/tasks/",
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

		await page.getByRole("button", { name: "Day" }).click()
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
			scheduled_start: today.toISOString(),
			duration: 60,
		})

		// Switch to day view and reload to pick up the new task
		await page.reload()
		await page.waitForLoadState("networkidle")
		await page.getByRole("button", { name: "Day" }).click()

		const block = page
			.locator('[data-testid="calendar-task-block"]')
			.filter({ hasText: taskTitle })
		await expect(block).toBeVisible({ timeout: 8000 })
	})
})

// --- Month View ---

test.describe("Month view", () => {
	test("shows task as chip on the correct day", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("networkidle")

		const taskTitle = `Month Chip ${randomString(5)}`
		const today = new Date()
		today.setHours(10, 0, 0, 0)
		await createTask(page, {
			title: taskTitle,
			scheduled_start: today.toISOString(),
			duration: 30,
		})

		await page.reload()
		await page.waitForLoadState("networkidle")
		await page.getByRole("button", { name: "Month" }).click()

		await expect(
			page.locator('[data-testid="calendar-month-view"]'),
		).toBeVisible()
		await expect(
			page
				.locator('[data-testid="calendar-month-view"]')
				.getByText(taskTitle),
		).toBeVisible({ timeout: 8000 })
	})

	test("shows +N more when more than 3 tasks on a day", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("networkidle")

		const today = new Date()
		// Create 4 tasks on the same day
		for (let i = 0; i < 4; i++) {
			const start = new Date(today)
			start.setHours(9 + i, 0, 0, 0)
			await createTask(page, {
				title: `Overflow ${i} ${randomString(4)}`,
				scheduled_start: start.toISOString(),
				duration: 30,
			})
		}

		await page.reload()
		await page.waitForLoadState("networkidle")
		await page.getByRole("button", { name: "Month" }).click()

		await expect(
			page
				.locator('[data-testid="calendar-month-view"]')
				.getByText("+1 more"),
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
