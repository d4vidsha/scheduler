from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models import Priority, User, UserCreate

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/tiangolo/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # from app.core.engine import engine
    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)

    # Seed priority rows if missing
    default_priorities = [
        (1, "urgent", 1),
        (2, "high", 2),
        (3, "medium", 3),
        (4, "low", 4),
    ]
    for pid, name, value in default_priorities:
        existing = session.get(Priority, pid)
        if not existing:
            session.add(Priority(id=pid, name=name, value=value))
    session.commit()
