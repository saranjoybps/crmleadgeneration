from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.attendance import (
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceRecordUpdate,
    ShiftCreate,
    ShiftUpdate,
    UserShiftAssignmentCreate,
    UserShiftAssignmentUpdate,
)
from app.services.attendance import AttendanceService

router = APIRouter(prefix="", tags=["attendance"])


@router.get("/shifts")
def list_shifts(
    active_only: bool = Query(default=False),
    ctx: RequestContext = Depends(require_module_permission("shift", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    shifts = AttendanceService.list_shifts(supabase, ctx, active_only=active_only)
    return response(shifts)


@router.post("/shifts")
def create_shift(
    payload: ShiftCreate,
    ctx: RequestContext = Depends(require_module_permission("shift", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    shift = AttendanceService.create_shift(supabase, payload, ctx)
    return response(shift)


@router.patch("/shifts/{shift_id}")
def update_shift(
    shift_id: str,
    payload: ShiftUpdate,
    ctx: RequestContext = Depends(require_module_permission("shift", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    shift = AttendanceService.update_shift(supabase, shift_id, payload, ctx)
    return response(shift)


@router.delete("/shifts/{shift_id}")
def delete_shift(
    shift_id: str,
    ctx: RequestContext = Depends(require_module_permission("shift", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    shift = AttendanceService.delete_shift(supabase, shift_id, ctx)
    return response(shift)


@router.get("/shift-assignments")
def list_assignments(
    user_id: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("shift", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    assignments = AttendanceService.list_assignments(supabase, ctx, user_id=user_id)
    return response(assignments)


@router.post("/shift-assignments")
def create_assignment(
    payload: UserShiftAssignmentCreate,
    ctx: RequestContext = Depends(require_module_permission("shift", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    assignment = AttendanceService.create_assignment(supabase, payload, ctx)
    return response(assignment)


@router.patch("/shift-assignments/{assignment_id}")
def update_assignment(
    assignment_id: str,
    payload: UserShiftAssignmentUpdate,
    ctx: RequestContext = Depends(require_module_permission("shift", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    assignment = AttendanceService.update_assignment(supabase, assignment_id, payload, ctx)
    return response(assignment)


@router.delete("/shift-assignments/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    ctx: RequestContext = Depends(require_module_permission("shift", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    assignment = AttendanceService.delete_assignment(supabase, assignment_id, ctx)
    return response(assignment)


@router.post("/attendance/check-in")
def check_in(
    payload: AttendanceCheckIn,
    ctx: RequestContext = Depends(require_module_permission("attendance", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    record = AttendanceService.check_in(supabase, payload, ctx)
    return response(record)


@router.post("/attendance/check-out")
def check_out(
    payload: AttendanceCheckOut,
    ctx: RequestContext = Depends(require_module_permission("attendance", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    record = AttendanceService.check_out(supabase, payload, ctx)
    return response(record)


@router.get("/attendance/today")
def get_today(
    ctx: RequestContext = Depends(require_module_permission("attendance", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    record = AttendanceService.get_today_status(supabase, ctx)
    return response(record)


@router.get("/attendance/records")
def list_my_records(
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    status: str | None = Query(default=None, alias="status"),
    ctx: RequestContext = Depends(require_module_permission("attendance", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    records = AttendanceService.list_my_records(
        supabase, ctx, from_date=from_date, to_date=to_date, status_filter=status
    )
    return response(records)


@router.get("/attendance/records/all")
def list_all_records(
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    status: str | None = Query(default=None, alias="status"),
    ctx: RequestContext = Depends(require_module_permission("attendance", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    records = AttendanceService.list_all_records(
        supabase, ctx,
        from_date=from_date, to_date=to_date,
        user_id=user_id, status_filter=status,
    )
    return response(records)


@router.patch("/attendance/records/{record_id}")
def update_record(
    record_id: str,
    payload: AttendanceRecordUpdate,
    ctx: RequestContext = Depends(require_module_permission("attendance", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    record = AttendanceService.update_record(supabase, record_id, payload, ctx)
    return response(record)


@router.delete("/attendance/records/{record_id}")
def delete_record(
    record_id: str,
    ctx: RequestContext = Depends(require_module_permission("attendance", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    record = AttendanceService.delete_record(supabase, record_id, ctx)
    return response(record)


@router.get("/attendance/reports/daily")
def daily_report(
    date: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("attendance", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    report = AttendanceService.get_daily_report(supabase, ctx, report_date=date)
    return response(report)


@router.get("/attendance/reports/summary")
def summary_report(
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("attendance", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    report = AttendanceService.get_summary_report(
        supabase, ctx, from_date=from_date, to_date=to_date, user_id=user_id
    )
    return response(report)
