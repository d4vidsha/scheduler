import uuid
from typing import Any

from fastapi import APIRouter, Body, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Message, Task, TaskCreate, TaskPublic, TasksPublic

router = APIRouter()


@router.get("/", response_model=TasksPublic)
def read_tasks(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve tasks.
    """
    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(Task)
        count = session.exec(count_statement).one()
        statement = select(Task).order_by(Task.position).offset(skip).limit(limit)
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
            .order_by(Task.position)
            .offset(skip)
            .limit(limit)
        )
        tasks = session.exec(statement).all()

    return TasksPublic(data=tasks, count=count)


@router.get("/{id}", response_model=TaskPublic)
def read_task(session: SessionDep, current_user: CurrentUser, id: str) -> Any:
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
) -> Any:
    """
    Create new task.
    """
    # get the highest position value for the current user's tasks
    max_position_query = select(func.max(Task.position)).where(
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
    *, session: SessionDep, current_user: CurrentUser, id: str, task_in: Task
) -> Any:
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


@router.post("/reorder", response_model=Message)
def reorder_tasks(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    task_ids: list[str] = Body(..., description="List of task IDs in the new order"),
) -> Any:
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
) -> Any:
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
