from typing import Literal
from pydantic import BaseModel, Field


VaultCredentialStatus = Literal["active", "archived", "disabled"]


class VaultCredentialCreate(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    username: str | None = None
    email_id: str | None = None
    password: str = Field(min_length=1, max_length=2048)
    notes: str | None = None
    login_url: str | None = None
    category: str | None = None
    tags: list[str] = Field(default_factory=list)
    status: VaultCredentialStatus = "active"


class VaultCredentialUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=200)
    username: str | None = None
    email_id: str | None = None
    password: str | None = Field(default=None, min_length=1, max_length=2048)
    notes: str | None = None
    login_url: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    status: VaultCredentialStatus | None = None


class VaultShareUpdate(BaseModel):
    user_id: str
    access: Literal["grant", "deny"]
