from typing import Any

from fastapi import APIRouter
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Task, TasksPublic

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
