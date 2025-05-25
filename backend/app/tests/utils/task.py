import datetime as datetime
import random

from sqlmodel import Session

from app import crud
from app.models import Priority, Task, TaskCreate
from app.tests.utils.user import create_random_user
from app.tests.utils.utils import (
    random_lower_string,  # Code from david imports own method, not sure if necessary ?
)


def create_random_priority(db: Session) -> Priority:
    priorityTitle = random_lower_string()
    priorityNum = random.randint(1, 9)
    priority = Priority(name=priorityTitle, value=priorityNum)
    db.add(priority)
    db.commit()
    db.refresh(priority)
    return priority
    # based on other code, this should likely be abstracted further to a PriorityCreate model, which creates it's own id (would need to make a new factory for the id too)
    # Not going to do too much, as I'm not certain this is how it should be implemented. Otherwise it would be done with crud.create_priority or something similar
    # This abstracts it out from test_tasks.py though


def create_random_task(db: Session) -> Task:
    title = random_lower_string()
    description = random_lower_string()
    priority = create_random_priority(db)

    duration = random.randint(1, 100)  # This is just an int, no sure how large it gets
    year = random.randint(2024, 9999)
    month = random.randint(1, 12)
    day = random.randint(
        1, 29
    )  # not going higher as random chance of tests failing due to days in months, ie 30th of Feb errors
    due = datetime.datetime(year, month, day)

    user = create_random_user(db)
    owner_id = user.id
    assert owner_id is not None
    task_in = TaskCreate(
        title=title,
        description=description,
        priority_id=priority.id,
        duration=duration,
        due=due,
    )
    return crud.create_task(session=db, task_in=task_in, owner_id=owner_id)
