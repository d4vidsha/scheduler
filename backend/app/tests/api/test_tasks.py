from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Task
from app.tests.utils.user import create_random_user
from app.tests.utils.utils import random_lower_string


def test_create_task(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"title": "Foo", "description": "Fighters"}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert "id" in content
    assert "owner_id" in content


def test_read_task(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    user = create_random_user(db)
    task = Task(
        title=random_lower_string(),
        description=random_lower_string(),
        owner_id=user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == task.title
    assert content["description"] == task.description
    assert content["id"] == str(task.id)
    assert content["owner_id"] == str(task.owner_id)


def test_read_tasks(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    user = create_random_user(db)
    task = Task(
        title=random_lower_string(),
        description=random_lower_string(),
        owner_id=user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    response = client.get(
        f"{settings.API_V1_STR}/tasks/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert len(content["data"]) > 0
    assert content["count"] > 0


def test_update_task(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    user = create_random_user(db)
    task = Task(
        title=random_lower_string(),
        description=random_lower_string(),
        owner_id=user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    data = {"title": "New title", "description": "New description"}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert content["id"] == str(task.id)
    assert content["owner_id"] == str(task.owner_id)


def test_delete_task(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    user = create_random_user(db)
    task = Task(
        title=random_lower_string(),
        description=random_lower_string(),
        owner_id=user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Task deleted successfully"


def test_toggle_task_completed(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    user = create_random_user(db)
    # Create a task with completed=False
    task = Task(
        title=random_lower_string(),
        description=random_lower_string(),
        owner_id=user.id,
        completed=False,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Toggle completed status to True
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task.id}/toggle-completed",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["completed"] is True

    # Toggle completed status back to False
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task.id}/toggle-completed",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["completed"] is False
