from typing import Any

from pydantic import BaseModel


class ApiError(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ApiResponse(BaseModel):
    data: Any
    meta: dict[str, Any] | None = None
    error: ApiError | None = None
    trace_id: str


class UserCreate(BaseModel):
    email: str
    full_name: str | None = None
    password: str
    role_key: str = "member"
    avatar_url: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    contact_email: str | None = None


class InviteCreate(BaseModel):
    email: str
    role_key: str


class RoleAssignment(BaseModel):
    user_id: str
    role_key: str


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    status: str | None = None
    member_user_ids: list[str] | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


class ProjectMemberCreate(BaseModel):
    user_id: str


class TicketCreate(BaseModel):
    project_id: str
    title: str
    description: str | None = None
    type: str = "other"
    priority: str | None = "medium"
    due_date: str | None = None
    status: str | None = None


class TicketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: str | None = None
    priority: str | None = None
    due_date: str | None = None
    status: str | None = None


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: str | None = None
    priority: str | None = "medium"
    due_date: str | None = None
    parent_task_id: str | None = None
    assignee_user_ids: list[str] | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: str | None = None


class TaskAssigneesUpdate(BaseModel):
    add_user_ids: list[str] | None = None
    remove_user_ids: list[str] | None = None
