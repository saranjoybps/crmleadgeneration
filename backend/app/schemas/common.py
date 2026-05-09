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


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    contact_email: str | None = None


class InviteCreate(BaseModel):
    email: str
    role_key: str


class RoleAssignment(BaseModel):
    user_id: str
    role_key: str
