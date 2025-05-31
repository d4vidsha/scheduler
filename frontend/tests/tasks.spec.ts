import { test, expect } from '@playwright/test';
import { randomString } from './utils/random';

test.describe('Tasks', () => {
  test('should create and display tasks', async ({ page }) => {
    // navigate to tasks page
    await page.goto('/tasks');

    // create a new task
    const taskTitle = `Test Task ${randomString(5)}`;
    await page.getByLabel('Title').fill(taskTitle);
    await page.getByLabel('Description').fill('This is a test task description');
    await page.getByRole('button', { name: 'Add Task' }).click();

    // verify task is displayed
    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test('should toggle task completion status', async ({ page }) => {
    // navigate to tasks page
    await page.goto('/tasks');

    // create a new task
    const taskTitle = `Toggle Task ${randomString(5)}`;
    await page.getByLabel('Title').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();

    // find the task and get its container
    const taskElement = page.getByText(taskTitle);
    await expect(taskElement).toBeVisible();

    // find the checkbox button (Circle icon) and click it to toggle completion
    const taskContainer = taskElement.locator('xpath=..');
    await taskContainer.getByRole('button').first().click();

    // verify task is marked as completed (has line-through style)
    await expect(taskElement).toHaveClass(/line-through/);

    // toggle back to incomplete
    await taskContainer.getByRole('button').first().click();

    // verify task is no longer marked as completed
    await expect(taskElement).not.toHaveClass(/line-through/);
  });

  test('should delete a task', async ({ page }) => {
    // navigate to tasks page
    await page.goto('/tasks');

    // create a new task
    const taskTitle = `Delete Task ${randomString(5)}`;
    await page.getByLabel('Title').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();

    // verify task is displayed
    await expect(page.getByText(taskTitle)).toBeVisible();

    // hover over the task to make delete button visible
    const taskRow = page.getByText(taskTitle).locator('xpath=../..');
    await taskRow.hover();

    // Set up dialog handler before clicking delete
    page.once('dialog', dialog => dialog.accept());

    // click the delete button (trash icon) - using a more specific selector
    // Find the button within the task row that contains the Trash2 icon
    await taskRow.locator('button[aria-label="Delete task"]').click();

    // verify task is removed
    await expect(page.getByText(taskTitle)).not.toBeVisible({ timeout: 5000 });
  });
});
