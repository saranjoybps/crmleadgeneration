from typing import Any
from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    name: str
    description: str | None = None
    slug: str


class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    slug: str | None = None


class DepartmentResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: str | None
    slug: str
    created_at: str
    updated_at: str


class DepartmentMemberInfo(BaseModel):
    user_id: str
    full_name: str | None
    email: str
    avatar_url: str | None
    department_role_key: str | None


class DepartmentWithMembers(DepartmentResponse):
    members: list[DepartmentMemberInfo] | None = None
    member_count: int = 0


class DepartmentRoleCreate(BaseModel):
    key: str
    label: str


class DepartmentRoleUpdate(BaseModel):
    label: str | None = None


class DepartmentRoleResponse(BaseModel):
    id: str
    tenant_id: str
    key: str
    label: str
    created_at: str


class UserDepartmentRoleUpdate(BaseModel):
    department_role_key: str  # e.g., 'manager', 'lead', 'member'


class DepartmentPermissionResponse(BaseModel):
    department_role_id: str
    module_id: str
    module_key: str
    can_view: bool
    can_create: bool
    can_edit: bool
    can_delete: bool


class DepartmentRoleWithPermissions(DepartmentRoleResponse):
    permissions: list[DepartmentPermissionResponse] | None = None
