import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.tests.utils.task import create_random_priority, create_random_task


def test_create_task(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    priority = create_random_priority(db)
    data = {
        "title": "String",
        "description": "Another String",
        "priority_id": priority.id,
        "duration": 0,
        "due": "2023-10-01T00:00:00",
    }
    response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert content["priority_id"] == data["priority_id"]
    assert content["duration"] == data["duration"]
    assert "id" in content
    assert "owner_id" in content
    # No need to individually asset id and owner id, as we compare to the json, if either doesn't exist it errors


def test_read_task(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    task = create_random_task(db)
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == task.title
    assert content["description"] == task.description
    assert content["priority_id"] == (task.priority_id)
    assert content["duration"] == (task.duration)
    assert "id" in content
    assert "owner_id" in content


def test_read_task_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Task not found"


def test_read_task_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    task = create_random_task(db)
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_read_tasks(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_task(db)
    create_random_task(db)
    response = client.get(
        f"{settings.API_V1_STR}/tasks/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert len(content["data"]) >= 2


def test_update_task(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    task = create_random_task(db)
    priority = create_random_priority(db)
    data = {
        "title": "Updated title",
        "description": "Updated description",
        "priority_id": priority.id,
        "duration": 0,
    }
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert content["priority_id"] == data["priority_id"]
    assert content["duration"] == data["duration"]
    assert "id" in content
    assert "owner_id" in content


def test_update_task_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"title": "Updated title", "description": "Updated description"}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Task not found"


def test_update_item_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    task = create_random_task(db)
    priority = create_random_priority(db)
    data = {
        "title": "Updated title",
        "description": "Updated description",
        "priority_id": priority.id,
        "duration": 100,
    }
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=normal_user_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_delete_task(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    task = create_random_task(db)
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Task deleted successfully"


def test_delete_task_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Task not found"


def test_delete_item_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    task = create_random_task(db)
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Not enough permissions"
