from datetime import date, datetime, time
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    position: str
    source: str | None = None
    current_company: str | None = None
    experience_years: int | None = None
    expected_salary: Decimal | None = None
    location: str | None = None
    resume_url: str | None = None
    notes: str | None = None


class CandidateUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    position: str | None = None
    source: str | None = None
    current_company: str | None = None
    experience_years: int | None = None
    expected_salary: Decimal | None = None
    location: str | None = None
    resume_url: str | None = None
    notes: str | None = None


class CandidateStatusChange(BaseModel):
    status: str
    note: str | None = None


class Candidate(BaseModel):
    id: UUID
    tenant_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    position: str
    source: str | None = None
    current_company: str | None = None
    experience_years: int | None = None
    expected_salary: Decimal | None = None
    location: str | None = None
    resume_url: str | None = None
    status: str
    notes: str | None = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InterviewCreate(BaseModel):
    interviewer_id: str
    scheduled_at: datetime
    duration_minutes: int = 60
    interview_type: str = "screening"
    round_number: int = 1
    notes: str | None = None


class InterviewUpdate(BaseModel):
    interviewer_id: str | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    interview_type: str | None = None
    round_number: int | None = None
    status: str | None = None
    feedback: str | None = None
    rating: int | None = None
    notes: str | None = None


class Interview(BaseModel):
    id: UUID
    tenant_id: UUID
    candidate_id: UUID
    interviewer_id: UUID
    scheduled_at: datetime
    duration_minutes: int
    interview_type: str
    round_number: int
    status: str
    feedback: str | None = None
    rating: int | None = None
    notes: str | None = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
