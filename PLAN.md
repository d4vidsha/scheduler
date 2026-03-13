# Scheduler Improvement Plan

**Vision:** Automatically schedule tasks into a calendar view — bridge the gap between the task inbox and the calendar.

## Current State Assessment

### What's solid
- Task CRUD with `position`, `priority`, `tags`, `due`, `duration` fields
- Natural language input parser (`AddTaskForm`) — `@tag`, `p1`–`p4`, day names
- Drag-and-drop task reordering
- Week calendar grid UI (navigable, auto-scrolls to current time)
- Split-panel dashboard layout
- Auth + user-scoped tasks

### Critical gaps
| Gap | Impact |
|-----|--------|
| Calendar shows hardcoded dummy events, not real tasks | The calendar is entirely decorative |
| No `scheduled_start` field on Task | Nothing can be placed at a specific time on the calendar |
| No scheduling algorithm | Core vision is unimplemented |
| `duration` field exists in DB but has no UI | Users can't express how long a task takes |
| Day/Month/Year calendar views are UI-only | View switcher buttons do nothing |
| No two-way calendar interaction | Can't drag/resize/click task blocks |

---

## Phase 1 — Connect Tasks to Calendar *(unblocks everything)*

**Goal:** Make the calendar show real data. Even without auto-scheduling, tasks with a due date/time should appear as blocks.

### Tasks
1. **Add `scheduled_start` (datetime, nullable) to Task model + Alembic migration**
   - `backend/app/models.py` — add field to `Task`, `TaskPublic`, `TaskCreate`, `TaskUpdate`
   - `cd backend && alembic revision --autogenerate -m "add scheduled_start to task"`
   - `alembic upgrade head`
   - Regenerate frontend client: `./scripts/generate-client.sh`

2. **Replace hardcoded dummy calendar events with real user tasks**
   - `frontend/src/components/calendar.tsx` — remove hardcoded events array
   - Accept `tasks: TaskPublic[]` as a prop (passed from `index.tsx`)
   - Render tasks that have `scheduled_start` as timed blocks at the correct grid position
   - Fall back to rendering tasks with only a `due` date as all-day chips at the top of their due date column

3. **Add duration to natural language parser + TaskItem display**
   - `frontend/src/components/tasks/AddTaskForm.tsx` — parse `1h`, `30m`, `2h30m` → `duration` in minutes
   - `frontend/src/components/tasks/TaskItem.tsx` — show duration badge (e.g. "1h") next to due date

---

## Phase 2 — Auto-Scheduling Engine *(the core vision)*

**Goal:** Given tasks with due dates and durations, automatically fill them into free calendar slots.

### Algorithm design
```
for each unscheduled task (no scheduled_start), sorted by priority then due date:
  find the earliest free slot >= now, within working_hours, that:
    - fits the task duration (default 30min if unset)
    - ends before or on the task due date
  assign scheduled_start = that slot start
  mark slot as occupied
```

### Tasks
1. **`POST /api/v1/tasks/schedule` endpoint**
   - Runs the algorithm above for the current user's tasks
   - Writes `scheduled_start` for each task that gets scheduled
   - Returns updated task list
   - Add to `backend/app/api/routes/tasks.py` and register in `backend/app/api/main.py`

2. **Working hours in user settings**
   - Store `work_start` (int, hour 0–23, default 9) and `work_end` (int, default 18) on the `User` model
   - Expose via `GET/PATCH /api/v1/users/me`
   - Settings page (`frontend/src/routes/_layout/settings.tsx`) — add working hours picker

3. **Auto-trigger scheduling**
   - After task create/update in the frontend, call `TasksService.scheduleTasks()` and invalidate the tasks query cache

---

## Phase 3 — Two-Way Calendar Interaction

**Goal:** The calendar becomes an editing surface, not just a read-only view.

### Tasks
1. **Drag task block → new time slot → PATCH `scheduled_start`**
2. **Resize task block bottom edge → PATCH `duration`**
3. **Click task block → open edit drawer/modal** (reuse or adapt existing task edit UI)
4. **Unscheduled tasks panel** — sidebar/overflow area on the calendar for tasks with no `scheduled_start`

---

## Phase 4 — Calendar View Completeness

**Goal:** Wire up view buttons that already exist in the UI.

### Tasks
1. **Day view** — single-day hourly grid (adapt existing week grid)
2. **Month view** — grid of days with task chips, `+N more` overflow
3. **Year view** — heat map showing task density per day (lighter = fewer tasks)
4. **Wire the switcher** — `frontend/src/components/calendar.tsx` view state → renders correct component

---

## Phase 5 — Polish & Intelligence

### Tasks
1. **Conflict detection** — overlapping `scheduled_start + duration` blocks render with a red border/background
2. **"Reschedule all" button** — re-runs `POST /api/v1/tasks/schedule` to recompute all slots (useful after bulk task edits)
3. **Keyboard shortcut `n`** — focuses `AddTaskForm` from anywhere on the dashboard
4. **Empty state** — guide new users: "Add a task with a due date and duration to see it appear on your calendar"
5. **Extended natural language** — "finish report by Friday, takes 2 hours" → `due=Friday`, `duration=120`, triggers scheduler

---

## Implementation Order & Dependencies

```
scheduled_start migration          ← must be first (everything depends on it)
  └─ real tasks on calendar        ← Phase 1 visible win
  └─ scheduling algorithm          ← Phase 2 core feature
       └─ working hours settings   ← Phase 2 supporting feature
       └─ auto-trigger scheduling  ← Phase 2 integration
            └─ drag/resize/click   ← Phase 3
            └─ view switcher       ← Phase 4 (independent)
                 └─ polish         ← Phase 5 (independent)
```

---

## Key Files

| File | Relevance |
|------|-----------|
| `backend/app/models.py` | Add `scheduled_start` to Task + schemas |
| `backend/app/api/routes/tasks.py` | Add `/schedule` endpoint |
| `backend/alembic/versions/` | New migration file |
| `frontend/src/components/calendar.tsx` | Replace dummy events, render real tasks |
| `frontend/src/routes/_layout/index.tsx` | Pass tasks prop to Calendar |
| `frontend/src/components/tasks/AddTaskForm.tsx` | Duration parsing |
| `frontend/src/components/tasks/TaskItem.tsx` | Duration display |
| `frontend/src/routes/_layout/settings.tsx` | Working hours UI |
| `frontend/src/client/` | Regenerated after backend changes |
