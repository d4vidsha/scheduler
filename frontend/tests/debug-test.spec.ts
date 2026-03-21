import { test } from "@playwright/test"

test("debug calendar task block", async ({ page }) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  const token = await page.evaluate(() => localStorage.getItem("access_token"))
  const today = new Date()
  today.setHours(10, 0, 0, 0)
  const taskTitle = `Debug Task UNIQUE999`
  
  const response = await page.request.post("http://localhost:8000/api/v1/tasks/", {
    headers: { Authorization: `Bearer ${token}` },
    data: { title: taskTitle, scheduled_start: today.toISOString(), duration: 60 },
  })
  const created = await response.json()
  console.log("Created scheduled_start:", created.scheduled_start)
  
  await page.reload()
  await page.waitForLoadState("networkidle")
  
  // Check what the page shows  
  const allBlocks = page.locator('[data-testid="calendar-task-block"]')
  const count = await allBlocks.count()
  console.log("Total calendar blocks:", count)
  
  // Check if the task title appears anywhere on the page
  const content = await page.content()
  const hasTitle = content.includes(taskTitle)
  console.log("Title in page HTML:", hasTitle)
  
  // Check if the React query returned it
  const tasksInReact = await page.evaluate(() => {
    // Try to find the task data
    return document.body.innerHTML.includes('Debug Task UNIQUE999')
  })
  console.log("Title in body:", tasksInReact)
  
  // Check timedTasks by looking at the data returned by API after page load
  const networkResp = await page.request.get("http://localhost:8000/api/v1/tasks/?limit=200", {
    headers: { Authorization: `Bearer ${token}` },
  })
  const allTasks = await networkResp.json()
  const myTask = allTasks.data.find((t: any) => t.title === taskTitle)
  console.log("Task in API list:", myTask ? JSON.stringify({id: myTask.id, scheduled_start: myTask.scheduled_start, completed: myTask.completed}) : "NOT FOUND")
  console.log("Total tasks in API:", allTasks.data.length)
})
