from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.tests.utils.user import create_random_user
from app.tests.utils.utils import random_lower_string


def test_create_task(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    title = random_lower_string()
    description = random_lower_string()
    data = {"title": title, "description": description}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == title
    assert content["description"] == description
    assert "id" in content
    assert "owner_id" in content


def test_create_task_with_owner(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    title = random_lower_string()
    description = random_lower_string()

    # create a random user
    user = create_random_user(db)

    # try to create a task with owner_id - this should be ignored
    data = {"title": title, "description": description, "owner_id": str(user.id)}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == title
    assert content["description"] == description
    assert "id" in content
    assert "owner_id" in content
    # the owner_id should be the superuser's ID, not the random user's ID
    assert content["owner_id"] != str(user.id)


def test_read_task(client: TestClient, superuser_token_headers: dict[str, str]) -> None:
    # create a task
    title = random_lower_string()
    description = random_lower_string()
    data = {"title": title, "description": description}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    task_id = content["id"]

    # read the task
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}", headers=superuser_token_headers
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == title
    assert content["description"] == description
    assert content["id"] == task_id


def test_update_task(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # create a task
    title = random_lower_string()
    description = random_lower_string()
    data = {"title": title, "description": description}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    task_id = content["id"]

    # update the task
    new_title = random_lower_string()
    new_description = random_lower_string()
    data = {"title": new_title, "description": new_description}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == new_title
    assert content["description"] == new_description
    assert content["id"] == task_id


def test_delete_task(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # create a task
    title = random_lower_string()
    description = random_lower_string()
    data = {"title": title, "description": description}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    task_id = content["id"]

    # delete the task
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/{task_id}", headers=superuser_token_headers
    )
    assert response.status_code == 200

    # try to read the deleted task
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}", headers=superuser_token_headers
    )
    assert response.status_code == 404


def test_toggle_task_completed(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # create a task
    title = random_lower_string()
    description = random_lower_string()
    data = {"title": title, "description": description}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    task_id = content["id"]
    initial_completed = content["completed"]

    # toggle completed status
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}/toggle-completed",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["completed"] != initial_completed

    # toggle again
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}/toggle-completed",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["completed"] == initial_completed
