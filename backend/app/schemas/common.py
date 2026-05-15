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
    department_id: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    avatar_url: str | None
    is_active: bool
    department_id: str | None = None
    department_name: str | None = None
    created_at: str
    updated_at: str



class WorkspaceUpdate(BaseModel):
    name: str | None = None
    contact_email: str | None = None


class InviteCreate(BaseModel):
    email: str
    role_key: str


class RoleAssignment(BaseModel):
    user_id: str
    role_key: str


class MilestoneCreate(BaseModel):
    project_id: str
    name: str
    description: str | None = None
    due_date: str
    status: str | None = "pending"


class MilestoneUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    due_date: str | None = None
    status: str | None = None


class ProjectCreate(BaseModel):
    name: str
    department_id: str | None = None
    description: str | None = None
    status: str | None = None
    member_user_ids: list[str] | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    department_id: str | None = None
    description: str | None = None
    status: str | None = None


class ProjectMemberCreate(BaseModel):
    user_id: str


class TicketCreate(BaseModel):
    project_id: str
    milestone_id: str | None = None
    title: str
    description: str | None = None
    type: str = "other"
    priority: str | None = "medium"
    start_date: str | None = None
    due_date: str | None = None
    status: str | None = None


class TicketUpdate(BaseModel):
    milestone_id: str | None = None
    title: str | None = None
    description: str | None = None
    type: str | None = None
    priority: str | None = None
    start_date: str | None = None
    due_date: str | None = None
    status: str | None = None


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: str | None = None
    priority: str | None = "medium"
    start_date: str | None = None
    due_date: str | None = None
    parent_task_id: str | None = None
    assignee_user_ids: list[str] | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    start_date: str | None = None
    due_date: str | None = None


class TaskDependencyCreate(BaseModel):
    depends_on_task_id: str
    dependency_type: str = "FS"


class TaskAssigneesUpdate(BaseModel):
    add_user_ids: list[str] | None = None
    remove_user_ids: list[str] | None = None
