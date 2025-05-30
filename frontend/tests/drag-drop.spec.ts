import { test, expect } from '@playwright/test';
import { randomString } from './utils/random';

test.describe('Task Drag and Drop', () => {
  test('should reorder tasks using drag and drop', async ({ page }) => {
    // navigate to tasks page
    await page.goto('/tasks');

    // create three tasks with unique names
    const taskTitles = [
      `Task A ${randomString(5)}`,
      `Task B ${randomString(5)}`,
      `Task C ${randomString(5)}`
    ];

    // create the tasks
    for (const title of taskTitles) {
      await page.getByLabel('Title').fill(title);
      await page.getByRole('button', { name: 'Add Task' }).click();
      // wait for the task to appear in the list
      await expect(page.getByText(title)).toBeVisible();
    }

    // verify initial order
    const taskElements = await page.locator('.task-item p').allTextContents();
    expect(taskElements[0]).toBe(taskTitles[0]);
    expect(taskElements[1]).toBe(taskTitles[1]);
    expect(taskElements[2]).toBe(taskTitles[2]);

    // get the drag handles
    const dragHandles = page.locator('.task-handle');

    // drag the first task to the position of the third task
    const firstTaskHandle = dragHandles.nth(0);
    const thirdTaskPosition = await page.locator('.task-item').nth(2).boundingBox();

    if (thirdTaskPosition) {
      // perform the drag operation
      await firstTaskHandle.dragTo(page.locator('.task-item').nth(2), {
        targetPosition: { x: thirdTaskPosition.x + 10, y: thirdTaskPosition.y + thirdTaskPosition.height / 2 }
      });

      // wait for the animation and reordering to complete
      await page.waitForTimeout(500);

      // verify the new order
      const newTaskElements = await page.locator('.task-item p').allTextContents();
      expect(newTaskElements[0]).toBe(taskTitles[1]);
      expect(newTaskElements[1]).toBe(taskTitles[2]);
      expect(newTaskElements[2]).toBe(taskTitles[0]);
    }
  });
});
