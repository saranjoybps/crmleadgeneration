from uuid import UUID
from typing import Optional
from pydantic import BaseModel, ConfigDict


class Module(BaseModel):
    id: UUID
    key: str
    label: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class RoleBase(BaseModel):
    key: str
    label: str


class RoleCreate(RoleBase):
    pass


class ModuleCreate(BaseModel):
    key: str
    label: str


class RoleUpdate(BaseModel):
    label: Optional[str] = None


class Role(RoleBase):
    id: UUID
    tenant_id: UUID
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class RolePermission(BaseModel):
    role_id: UUID
    module_id: UUID
    can_view: bool
    can_create: bool
    can_edit: bool
    can_delete: bool
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class PermissionUpdate(BaseModel):
    role_id: str
    module_key: str
    can_view: Optional[bool] = None
    can_create: Optional[bool] = None
    can_edit: Optional[bool] = None
    can_delete: Optional[bool] = None


class RoleWithPermissions(Role):
    permissions: list[RolePermission]

    model_config = ConfigDict(from_attributes=True)