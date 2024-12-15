from fastapi.testclient import TestClient
from sqlmodel import Session
from app.core.config import settings
from app.tests.utils.task import create_random_task
#Read tasks
#Read task that doesn't exist
#Read task without permissions

#Create task
#Read tasks (multiple)
#Update task
#Update task for task not found
#Update task with lack of permission
#Delete task for task not found
#Delete task
#Test deletion for not enough perms