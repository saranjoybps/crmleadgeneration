from datetime import date, datetime, time
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ShiftBase(BaseModel):
    name: str
    start_time: time
    end_time: time
    grace_period_minutes: int = 5
    late_threshold_minutes: int = 30
    half_day_after_minutes: int = 240
    description: str | None = None
    is_active: bool = True


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    name: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    grace_period_minutes: int | None = None
    late_threshold_minutes: int | None = None
    half_day_after_minutes: int | None = None
    description: str | None = None
    is_active: bool | None = None


class Shift(ShiftBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserShiftAssignmentCreate(BaseModel):
    user_id: str
    shift_id: str
    effective_from: date | None = None
    effective_to: date | None = None


class UserShiftAssignmentUpdate(BaseModel):
    shift_id: str | None = None
    effective_from: date | None = None
    effective_to: date | None = None


class AttendanceCheckIn(BaseModel):
    note: str | None = None


class AttendanceCheckOut(BaseModel):
    note: str | None = None


class AttendanceRecordUpdate(BaseModel):
    check_in_time: datetime | None = None
    check_out_time: datetime | None = None
    status: str | None = None
    shift_id: str | None = None
    correction_reason: str | None = None
    note: str | None = None


class AttendanceRecord(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    date: date
    shift_id: UUID | None = None
    check_in_time: datetime | None = None
    check_out_time: datetime | None = None
    status: str
    working_minutes: int | None = None
    late_minutes: int | None = None
    overtime_minutes: int | None = None
    check_in_note: str | None = None
    check_out_note: str | None = None
    corrected_by: UUID | None = None
    correction_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    shift: Shift | None = None
    model_config = ConfigDict(from_attributes=True)
