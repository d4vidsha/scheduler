import { expect, test } from "@playwright/test"

// --- Settings tests (no backend API calls needed) ---

test.describe("Settings", () => {
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
