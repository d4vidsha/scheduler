from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import Priority, UserCreate
from app.tests.utils.user import (
    create_random_user,
    user_authentication_headers,
)
from app.tests.utils.utils import random_lower_string


def _create_priority(db: Session, name: str = "medium", value: int = 2) -> Priority:
    priority = Priority(name=name, value=value)
    db.add(priority)
    db.commit()
    db.refresh(priority)
    return priority


def _fresh_user_headers(client: TestClient, db: Session) -> dict[str, str]:
    """Create a brand-new user and return auth headers."""
    password = random_lower_string()
    user_in = UserCreate(email=f"{random_lower_string()}@test.com", password=password)
    user = crud.create_user(session=db, user_create=user_in)
    return user_authentication_headers(
        client=client, email=user.email, password=password
    )


def _create_task(
    client: TestClient, headers: dict[str, str], **fields: object
) -> dict:
    """Create a task via API and assert success."""
    data: dict[str, object] = {"title": random_lower_string(), **fields}
    resp = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=headers, json=data
    )
    assert resp.status_code == 200
    return resp.json()


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


def test_create_task_with_tags(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    title = random_lower_string()
    data = {"title": title, "tags": ["work", "urgent"]}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == title
    assert content["tags"] == ["work", "urgent"]


def test_create_task_with_priority(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    priority = _create_priority(db)
    title = random_lower_string()
    data = {"title": title, "priority_id": priority.id}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == title
    assert content["priority_id"] == priority.id


def test_create_task_with_due_date(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    title = random_lower_string()
    due = "2026-04-01T09:00:00"
    data = {"title": title, "due": due}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == title
    assert content["due"] is not None


def test_create_task_with_scheduled_start(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    title = random_lower_string()
    scheduled_start = "2026-03-15T10:00:00"
    data = {"title": title, "scheduled_start": scheduled_start}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == title
    assert content["scheduled_start"] is not None
    # The returned value should contain the datetime we sent
    assert scheduled_start in content["scheduled_start"]


def test_create_task_without_scheduled_start(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    title = random_lower_string()
    data = {"title": title}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == title
    assert content["scheduled_start"] is None


def test_update_task_scheduled_start(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # create a task without scheduled_start
    title = random_lower_string()
    data = {"title": title}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    task_id = response.json()["id"]

    # update the task to set scheduled_start
    scheduled_start = "2026-03-16T14:30:00"
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=superuser_token_headers,
        json={"scheduled_start": scheduled_start},
    )
    assert response.status_code == 200
    content = response.json()
    assert content["scheduled_start"] is not None
    assert scheduled_start in content["scheduled_start"]

    # verify via GET
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}", headers=superuser_token_headers
    )
    assert response.status_code == 200
    content = response.json()
    assert content["scheduled_start"] is not None
    assert scheduled_start in content["scheduled_start"]


def test_clear_task_scheduled_start(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # create a task with scheduled_start
    title = random_lower_string()
    scheduled_start = "2026-03-17T09:00:00"
    data = {"title": title, "scheduled_start": scheduled_start}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    task_id = content["id"]
    assert content["scheduled_start"] is not None

    # clear scheduled_start by setting it to null
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=superuser_token_headers,
        json={"scheduled_start": None},
    )
    assert response.status_code == 200
    content = response.json()
    assert content["scheduled_start"] is None

    # verify via GET
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}", headers=superuser_token_headers
    )
    assert response.status_code == 200
    content = response.json()
    assert content["scheduled_start"] is None


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


# ---------------------------------------------------------------------------
# List tasks
# ---------------------------------------------------------------------------


def test_read_tasks(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    _create_task(client, superuser_token_headers)
    response = client.get(
        f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1
    assert len(content["data"]) >= 1


def test_read_tasks_normal_user_sees_only_own(
    client: TestClient, db: Session
) -> None:
    headers_a = _fresh_user_headers(client, db)
    headers_b = _fresh_user_headers(client, db)

    task_a = _create_task(client, headers_a, title="Task A")
    _create_task(client, headers_b, title="Task B")

    resp = client.get(
        f"{settings.API_V1_STR}/tasks/?limit=500", headers=headers_a
    )
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()["data"]]
    assert task_a["id"] in ids
    # user A should not see user B's tasks
    assert all(t["owner_id"] == task_a["owner_id"] for t in resp.json()["data"])


# ---------------------------------------------------------------------------
# Reorder tasks
# ---------------------------------------------------------------------------


def test_reorder_tasks(
    client: TestClient, db: Session
) -> None:
    headers = _fresh_user_headers(client, db)
    t1 = _create_task(client, headers)
    t2 = _create_task(client, headers)
    t3 = _create_task(client, headers)

    # Reorder: t3, t1, t2
    resp = client.post(
        f"{settings.API_V1_STR}/tasks/reorder",
        headers=headers,
        json=[t3["id"], t1["id"], t2["id"]],
    )
    assert resp.status_code == 200

    # Verify positions via list (ordered by position)
    resp = client.get(f"{settings.API_V1_STR}/tasks/", headers=headers)
    ids = [t["id"] for t in resp.json()["data"]]
    assert ids == [t3["id"], t1["id"], t2["id"]]


# ---------------------------------------------------------------------------
# Error paths
# ---------------------------------------------------------------------------


def test_read_task_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    import uuid

    fake_id = str(uuid.uuid4())
    resp = client.get(
        f"{settings.API_V1_STR}/tasks/{fake_id}", headers=superuser_token_headers
    )
    assert resp.status_code == 404


def test_update_task_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    import uuid

    fake_id = str(uuid.uuid4())
    resp = client.put(
        f"{settings.API_V1_STR}/tasks/{fake_id}",
        headers=superuser_token_headers,
        json={"title": "nope"},
    )
    assert resp.status_code == 404


def test_delete_task_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    import uuid

    fake_id = str(uuid.uuid4())
    resp = client.delete(
        f"{settings.API_V1_STR}/tasks/{fake_id}", headers=superuser_token_headers
    )
    assert resp.status_code == 404


def test_normal_user_cannot_read_other_users_task(
    client: TestClient, db: Session
) -> None:
    headers_a = _fresh_user_headers(client, db)
    headers_b = _fresh_user_headers(client, db)

    task_a = _create_task(client, headers_a)
    resp = client.get(
        f"{settings.API_V1_STR}/tasks/{task_a['id']}", headers=headers_b
    )
    assert resp.status_code == 400


def test_normal_user_cannot_delete_other_users_task(
    client: TestClient, db: Session
) -> None:
    headers_a = _fresh_user_headers(client, db)
    headers_b = _fresh_user_headers(client, db)

    task_a = _create_task(client, headers_a)
    resp = client.delete(
        f"{settings.API_V1_STR}/tasks/{task_a['id']}", headers=headers_b
    )
    assert resp.status_code == 400
