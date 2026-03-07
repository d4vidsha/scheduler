import { expect, test } from "@playwright/test"
import { randomString } from "./utils/random"

test.describe("Tasks", () => {
  test("should create and display tasks", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Test Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(page.getByText(taskTitle)).toBeVisible()
  })

  test("should strip @tag from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Tag Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} @work`)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(page.getByText(baseTitle)).toBeVisible()
    await expect(page.getByText(`${baseTitle} @work`)).not.toBeVisible()
  })

  test("should strip priority token from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Priority Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} p1`)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(page.getByText(baseTitle)).toBeVisible()
    await expect(page.getByText(`${baseTitle} p1`)).not.toBeVisible()
  })

  test("should strip date token from displayed title", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `Date Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(`${baseTitle} tuesday`)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(page.getByText(baseTitle)).toBeVisible()
    await expect(page.getByText(`${baseTitle} tuesday`)).not.toBeVisible()
  })

  test("should strip all natural language tokens combined", async ({ page }) => {
    await page.goto("/tasks")

    const baseTitle = `NL Task ${randomString(5)}`
    await page
      .getByPlaceholder(/Task title/)
      .fill(`${baseTitle} @work p2 monday`)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(page.getByText(baseTitle)).toBeVisible()
    await expect(page.getByText(`${baseTitle} @work p2 monday`)).not.toBeVisible()
  })

  test("should submit on Enter key", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Enter Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByPlaceholder(/Task title/).press("Enter")

    await expect(page.getByText(taskTitle)).toBeVisible()
  })

  test("should toggle task completion status", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Toggle Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add" }).click()

    const taskElement = page.getByText(taskTitle)
    await expect(taskElement).toBeVisible()

    const taskContainer = taskElement.locator("xpath=..")
    await taskContainer.getByRole("button").first().click()

    await expect(taskElement).toHaveClass(/line-through/)

    await taskContainer.getByRole("button").first().click()

    await expect(taskElement).not.toHaveClass(/line-through/)
  })

  test("should delete a task", async ({ page }) => {
    await page.goto("/tasks")

    const taskTitle = `Delete Task ${randomString(5)}`
    await page.getByPlaceholder(/Task title/).fill(taskTitle)
    await page.getByRole("button", { name: "Add" }).click()

    await expect(page.getByText(taskTitle)).toBeVisible()

    const taskRow = page.getByText(taskTitle).locator("xpath=../..")
    await taskRow.hover()

    page.once("dialog", (dialog) => dialog.accept())
    await taskRow.locator('button[aria-label="Delete task"]').click()

    await expect(page.getByText(taskTitle)).not.toBeVisible({ timeout: 5000 })
  })
})
