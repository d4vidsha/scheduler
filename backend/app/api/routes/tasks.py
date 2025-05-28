import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Message, Task, TaskPublic, TasksPublic

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
        statement = select(Task).offset(skip).limit(limit)
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
    *, session: SessionDep, current_user: CurrentUser, task_in: Task
) -> Any:
    """
    Create new task.
    """
    task = Task(
        title=task_in.title,
        description=task_in.description,
        priority_id=task_in.priority_id,
        duration=task_in.duration,
        due=task_in.due,
        owner_id=current_user.id,
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
