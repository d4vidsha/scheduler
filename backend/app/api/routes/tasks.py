import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Body, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Message,
    ScheduleTasksRequest,
    Task,
    TaskCreate,
    TaskPublic,
    TasksPublic,
    TaskUpdate,
)

router = APIRouter()


@router.get("/", response_model=TasksPublic)
def read_tasks(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> TasksPublic:
    """
    Retrieve tasks.
    """
    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(Task)
        count = session.exec(count_statement).one()
        statement = select(Task).order_by(col(Task.position)).offset(skip).limit(limit)
        tasks = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(Task)
            .where(Task.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(Task)
            .where(Task.owner_id == current_user.id)
            .order_by(col(Task.position))
            .offset(skip)
            .limit(limit)
        )
        tasks = session.exec(statement).all()

    return TasksPublic(data=tasks, count=count)


@router.get("/{id}", response_model=TaskPublic)
def read_task(session: SessionDep, current_user: CurrentUser, id: str) -> Task:
    """
    Get task by ID.
    """
    try:
        task_id = uuid.UUID(id)
        task = session.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if not current_user.is_superuser and (task.owner_id != current_user.id):
            raise HTTPException(status_code=400, detail="Not enough permissions")
        return task
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid task ID format")


@router.post("/", response_model=TaskPublic)
def create_task(
    *, session: SessionDep, current_user: CurrentUser, task_in: TaskCreate
) -> Task:
    """
    Create new task.
    """
    # get the highest position value for the current user's tasks
    max_position_query: Any = select(func.max(Task.position)).where(
        Task.owner_id == current_user.id
    )
    max_position = session.exec(max_position_query).one() or 0

    # set the new task's position to be one larger than the current max
    task = Task.model_validate(
        task_in, update={"owner_id": current_user.id, "position": max_position + 1}
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.put("/{id}", response_model=TaskPublic)
def update_task(
    *, session: SessionDep, current_user: CurrentUser, id: str, task_in: TaskUpdate
) -> Task:
    """
    Update a task.
    """
    try:
        task_id = uuid.UUID(id)
        task = session.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if not current_user.is_superuser and (task.owner_id != current_user.id):
            raise HTTPException(status_code=400, detail="Not enough permissions")
        update_dict = task_in.model_dump(exclude_unset=True)
        task.sqlmodel_update(update_dict)
        session.add(task)
        session.commit()
        session.refresh(task)
        return task
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid task ID format")


@router.delete("/{id}")
def delete_task(session: SessionDep, current_user: CurrentUser, id: str) -> Message:
    """
    Delete a task.
    """
    try:
        task_id = uuid.UUID(id)
        task = session.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if not current_user.is_superuser and (task.owner_id != current_user.id):
            raise HTTPException(status_code=400, detail="Not enough permissions")
        session.delete(task)
        session.commit()
        return Message(message="Task deleted successfully")
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid task ID format")


@router.post("/schedule", response_model=TasksPublic)
def schedule_tasks(
    session: SessionDep,
    current_user: CurrentUser,
    body: ScheduleTasksRequest | None = None,
) -> TasksPublic:
    """
    Auto-schedule incomplete tasks with a due date into working-hour slots.
    Optionally pass task_ids to schedule only specific tasks.
    """
    req = body or ScheduleTasksRequest()
    client_now = req.client_now
    task_ids = req.task_ids

    work_start = current_user.work_start
    work_end = current_user.work_end

    # Fetch incomplete tasks with a due date, ordered by priority ASC NULLS LAST, then due ASC
    statement = (
        select(Task)
        .where(
            Task.owner_id == current_user.id,
            Task.completed == False,  # noqa: E712
            Task.due.is_not(None),  # type: ignore[union-attr]
        )
        .order_by(
            col(Task.priority_id).asc().nulls_last(),
            col(Task.due).asc(),
        )
    )
    if task_ids is not None:
        statement = statement.where(col(Task.id).in_(task_ids))
    tasks = list(session.exec(statement).all())

    now = client_now if client_now is not None else datetime.utcnow()
    # Round now up to the next 30-minute boundary
    minutes = now.minute
    remainder = minutes % 30
    if remainder == 0 and now.second == 0 and now.microsecond == 0:
        slot_start_base = now.replace(second=0, microsecond=0)
    else:
        slot_start_base = now.replace(second=0, microsecond=0) + timedelta(
            minutes=(30 - remainder) % 30 if remainder != 0 else 0
        )
        # If remainder is 0 but there are seconds/microseconds, round up by 30
        if remainder == 0:
            slot_start_base = now.replace(second=0, microsecond=0) + timedelta(
                minutes=30
            )

    # Track assigned slots as list of (start, end) tuples
    assigned_slots: list[tuple[datetime, datetime]] = []

    # When scheduling a subset, pre-populate with existing scheduled tasks
    # so new assignments don't overlap with already-scheduled ones.
    if task_ids is not None:
        task_id_set = set(task_ids)
        existing_statement = (
            select(Task)
            .where(
                Task.owner_id == current_user.id,
                Task.completed == False,  # noqa: E712
                Task.scheduled_start.is_not(None),  # type: ignore[union-attr]
            )
        )
        for t in session.exec(existing_statement).all():
            if t.id not in task_id_set and t.scheduled_start is not None:
                dur = timedelta(minutes=t.duration if t.duration else 30)
                assigned_slots.append((t.scheduled_start, t.scheduled_start + dur))

    MAX_DAYS_AHEAD = 365

    for task in tasks:
        duration_minutes = task.duration if task.duration is not None else 30
        duration = timedelta(minutes=duration_minutes)
        due = task.due

        candidate = slot_start_base
        found_slot: datetime | None = None

        # Iterate forward in 30-minute increments, up to MAX_DAYS_AHEAD days
        limit = slot_start_base + timedelta(days=MAX_DAYS_AHEAD)
        while candidate < limit:
            candidate_end = candidate + duration

            # Must end by the due date
            if due is not None and candidate_end > due:
                break

            # Must be within working hours on this day
            if candidate.hour < work_start or candidate.hour >= work_end:
                # Jump to next working hour
                if candidate.hour >= work_end:
                    # Move to next day at work_start
                    next_day = (candidate + timedelta(days=1)).replace(
                        hour=work_start, minute=0, second=0, microsecond=0
                    )
                    candidate = next_day
                else:
                    # Before work_start today
                    today_start = candidate.replace(
                        hour=work_start, minute=0, second=0, microsecond=0
                    )
                    candidate = today_start
                continue

            # Also check that the slot end doesn't spill past work_end
            work_end_dt = candidate.replace(
                hour=work_end, minute=0, second=0, microsecond=0
            )
            if candidate_end > work_end_dt:
                # Jump to next day at work_start
                next_day = (candidate + timedelta(days=1)).replace(
                    hour=work_start, minute=0, second=0, microsecond=0
                )
                candidate = next_day
                continue

            # Check overlap with already-assigned slots
            overlaps = False
            for slot_s, slot_e in assigned_slots:
                if candidate < slot_e and candidate_end > slot_s:
                    overlaps = True
                    # Jump to end of the overlapping slot
                    # Round up to next 30-min boundary after slot_e
                    slot_e_minutes = slot_e.minute % 30
                    if slot_e_minutes == 0 and slot_e.second == 0:
                        candidate = slot_e
                    else:
                        candidate = slot_e.replace(second=0, microsecond=0) + timedelta(
                            minutes=(30 - slot_e.minute % 30) % 30
                        )
                        if slot_e.minute % 30 == 0:
                            candidate = slot_e.replace(
                                second=0, microsecond=0
                            ) + timedelta(minutes=30)
                    break
            if overlaps:
                continue

            # Valid slot found
            found_slot = candidate
            break

        if found_slot is not None:
            task.scheduled_start = found_slot
            assigned_slots.append((found_slot, found_slot + duration))
            session.add(task)

    session.commit()

    # Return full updated task list for this user
    count_statement = (
        select(func.count()).select_from(Task).where(Task.owner_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    all_tasks_statement = (
        select(Task)
        .where(Task.owner_id == current_user.id)
        .order_by(col(Task.position))
    )
    all_tasks = session.exec(all_tasks_statement).all()
    return TasksPublic(data=list(all_tasks), count=count)


@router.post("/reorder", response_model=Message)
def reorder_tasks(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    task_ids: list[str] = Body(..., description="List of task IDs in the new order"),
) -> Message:
    """
    Reorder tasks based on the provided list of task IDs.
    """
    # verify all tasks exist and belong to the current user
    for position, task_id in enumerate(task_ids, start=1):
        try:
            task_uuid = uuid.UUID(task_id)
            task = session.get(Task, task_uuid)
            if not task:
                raise HTTPException(
                    status_code=404, detail=f"Task with ID {task_id} not found"
                )
            if task.owner_id != current_user.id and not current_user.is_superuser:
                raise HTTPException(status_code=400, detail="Not enough permissions")

            # update the position
            task.position = position
            session.add(task)
        except ValueError:
            raise HTTPException(
                status_code=422, detail=f"Invalid task ID format: {task_id}"
            )

    session.commit()
    return Message(message="Tasks reordered successfully")


@router.put("/{id}/toggle-completed", response_model=TaskPublic)
def toggle_task_completed(
    *, session: SessionDep, current_user: CurrentUser, id: str
) -> Task:
    """
    Toggle the completed status of a task.
    """
    try:
        task_id = uuid.UUID(id)
        task = session.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if not current_user.is_superuser and (task.owner_id != current_user.id):
            raise HTTPException(status_code=400, detail="Not enough permissions")

        task.completed = not task.completed

        session.add(task)
        session.commit()
        session.refresh(task)
        return task
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid task ID format")
