import uuid
import random
from sqlmodel import Session
from app import crud
from app.models import Task, TaskCreate
from app.tests.utils.utils import random_lower_string #Code from david imports own method, not sure if necessary ?
from app.tests.utils.user import create_random_user
import sqlalchemy as sa
import datetime as datetime

def create_random_task(db: Session) -> Task:
  title = random_lower_string()
  description = random_lower_string()
  priority_id = random.randint(1,10) #Debated making a function for this, used as a one off though
  duration = random.randint(1,100) #This is just an int, no sure how large it gets
  year = random.randint(2024,9999)
  month = random.randint(1,12)
  day = random.randint(1,28) #not going higher as random chance of tests failing due to days in months, ie 29th of Feb should fail
  due = datetime.datetime(year, month, day)
  task_id = uuid.uuid4
  owner_id = create_random_user(db).id