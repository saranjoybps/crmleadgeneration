from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class TodoBase(BaseModel):
    title: str
    description: str | None = None
    is_completed: bool = False
    due_date: datetime | None = None

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_completed: bool | None = None
    due_date: datetime | None = None

class Todo(TodoBase):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
