from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class DocumentTypeCreate(BaseModel):
    name: str
    key: str
    description: str | None = None


class DocumentTypeUpdate(BaseModel):
    name: str | None = None
    key: str | None = None
    description: str | None = None
    is_active: bool | None = None


class DocumentType(BaseModel):
    id: UUID
    tenant_id: UUID | None = None
    name: str
    key: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TemplateCreate(BaseModel):
    name: str
    document_type_id: str | None = None
    content: str
    variables: list[dict] | None = None


class TemplateUpdate(BaseModel):
    name: str | None = None
    document_type_id: str | None = None
    content: str | None = None
    variables: list[dict] | None = None
    is_active: bool | None = None


class Template(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    document_type_id: UUID | None = None
    content: str
    variables: list[dict]
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DocumentGenerateRequest(BaseModel):
    template_id: str
    employee_id: str
    title: str = Field(..., min_length=1, max_length=255)
    content_data: dict


class GeneratedDocument(BaseModel):
    id: UUID
    tenant_id: UUID
    template_id: UUID | None = None
    document_type_id: UUID | None = None
    employee_id: UUID
    title: str
    content_data: dict
    generated_by: UUID
    generated_at: datetime
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AIGenerateRequest(BaseModel):
    document_type_key: str
    employee_name: str
    employee_id: str | None = None
    designation: str | None = None
    department: str | None = None
    joining_date: str | None = None
    salary: str | None = None
    company_name: str | None = None
    additional_context: str | None = None
