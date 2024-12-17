import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.tests.utils.task import create_random_task


def test_create_task(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    task_id = str(uuid.uuid4())
    owner_id = str(uuid.uuid4())
    data = {
        "title": "String",
        "description": "Another String",
        "priority_id": 0,
        "duration": 0,
        "id": task_id,
        "owner_id": owner_id,
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
    assert content["id"] == data["id"]
    assert content["owner_id"] == data["owner_id"]
    # No need to individually asset id and owner id, as we compare to the json, if either doesn't exist it errors


def test_read_task(
    client: TestClient, super_user_token_headers: dict[str, str], db: Session
) -> None:
    task = create_random_task(db)
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=super_user_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == task.title
    assert content["description"] == task.description
    assert content["priority_id"] == str(task.priority_id)
    assert content["duration"] == str(task.duration)
    assert content["id"] == str(task.id)
    assert content["owner_id"] == str(task.owner_id)


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
        f"{settings.API_V1_STR}/tasks{task.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 400
    content = response.json()
    assert ["content"] == "Not enough permissions"


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
    data = {
        "title": "Updated title",
        "description": "Updated description",
        "priority_id": 100,
        "duration": 100,
    }
    response = client.put(
        f"{settings.API_V1_STR}/items/{task.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert content["priority_id"] == data["priority_id"]
    assert content["duration"] == data["duration"]
    assert content["id"] == str(task.id)
    assert content["owner_id"] == str(task.owner_id)


def test_update_task_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"title": "Updated title", "description": "Updated description"}
    response = client.put(
        f"{settings.API_V1_STR}/items/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Task not found"


def test_update_item_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    task = create_random_task(db)
    data = {
        "title": "Updated title",
        "description": "Updated description",
        "priority_id": 100,
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
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Item deleted successfully"


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
        f"{settings.API_V1_STR}/task/{task.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Not enough permissions"
