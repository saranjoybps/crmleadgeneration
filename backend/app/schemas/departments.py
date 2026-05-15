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
    joined_at: str | None = None


class DepartmentWithMembers(DepartmentResponse):
    members: list[DepartmentMemberInfo] | None = None
    member_count: int = 0
