from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "medium"
    target_type: str = "all"
    target_ids: list[str] | None = None


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    priority: str | None = None
    target_type: str | None = None
    target_ids: list[str] | None = None


class AnnouncementRead(BaseModel):
    announcement_id: str


class AnnouncementTargetOut(BaseModel):
    id: UUID
    target_type: str
    target_id: UUID


class AnnouncementOut(BaseModel):
    id: UUID
    tenant_id: UUID
    title: str
    content: str
    priority: str
    target_type: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    targets: list[AnnouncementTargetOut] = []
    read_count: int = 0
    is_read: bool = False

    model_config = ConfigDict(from_attributes=True)
