from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal


class LeaveTypeBase(BaseModel):
    name: str
    description: str | None = None
    days_per_year: Decimal = Field(default=0, max_digits=5, decimal_places=1)
    requires_approval: bool = True
    is_active: bool = True
    is_paid: bool = True
    sort_order: int = 0
    color: str | None = None


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    days_per_year: Decimal | None = Field(default=None, max_digits=5, decimal_places=1)
    requires_approval: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    color: str | None = None


class LeaveType(LeaveTypeBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LeaveBalance(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    leave_type_id: UUID
    year: int
    total_days: Decimal
    used_days: Decimal
    pending_days: Decimal
    created_at: datetime
    updated_at: datetime
    leave_type: LeaveType | None = None
    model_config = ConfigDict(from_attributes=True)


class LeaveRequestCreate(BaseModel):
    leave_type_id: str
    start_date: date
    end_date: date
    half_day: bool = False
    half_day_period: str | None = None
    reason: str | None = None


class LeaveRequestCancel(BaseModel):
    reason: str | None = None


class LeaveRequestApprove(BaseModel):
    pass


class LeaveRequestReject(BaseModel):
    rejection_reason: str | None = None


class LeaveRequest(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    leave_type_id: UUID
    start_date: date
    end_date: date
    duration_days: Decimal
    half_day: bool
    half_day_period: str | None = None
    reason: str | None = None
    status: str
    approved_by: UUID | None = None
    approved_at: datetime | None = None
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    leave_type: LeaveType | None = None
    user: dict | None = None
    model_config = ConfigDict(from_attributes=True)


class LeaveBalanceSummary(BaseModel):
    leave_type_id: UUID
    leave_type: LeaveType | None = None
    year: int
    total_days: Decimal
    used_days: Decimal
    pending_days: Decimal
    available_days: Decimal


class LeaveRequestWithApprover(LeaveRequest):
    approver: dict | None = None
