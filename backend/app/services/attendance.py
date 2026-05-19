from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.attendance import (
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceRecordUpdate,
    ShiftCreate,
    ShiftUpdate,
    UserShiftAssignmentCreate,
)


def _determine_checkin_status(
    check_in: datetime,
    shift_start: time,
    grace_minutes: int,
    late_minutes: int,
) -> tuple[str, int]:
    check_in_local = check_in.astimezone()
    shift_start_dt = datetime.combine(
        check_in_local.date(), shift_start, tzinfo=check_in_local.tzinfo
    )
    diff = (check_in_local - shift_start_dt).total_seconds() / 60
    if diff <= grace_minutes:
        return "present", 0
    if diff <= late_minutes:
        return "late", int(diff)
    return "late", int(diff)


def _determine_checkout_status(
    check_in: datetime,
    check_out: datetime,
    shift_start: time,
    shift_end: time,
    half_day_minutes: int,
) -> tuple[str, int, int]:
    working = (check_out - check_in).total_seconds() / 60
    working_int = int(working)

    check_in_local = check_in.astimezone()
    check_out_local = check_out.astimezone()
    tz = check_in_local.tzinfo
    start_dt = datetime.combine(check_in_local.date(), shift_start, tzinfo=tz)
    end_dt = datetime.combine(check_in_local.date(), shift_end, tzinfo=tz)

    if check_out_local > end_dt:
        overtime = int((check_out_local - end_dt).total_seconds() / 60)
    else:
        overtime = 0

    if working_int < half_day_minutes:
        return "half_day", working_int, overtime

    if overtime > 0:
        return "overtime", working_int, overtime

    check_in_diff = (check_in_local - start_dt).total_seconds() / 60
    if check_in_diff > 5:
        return "late", working_int, overtime

    return "present", working_int, overtime


class AttendanceService:
    @staticmethod
    def list_shifts(supabase: Client, ctx: RequestContext, active_only: bool = False):
        query = (
            supabase.table("shifts")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .order("name")
        )
        if active_only:
            query = query.eq("is_active", True)
        res = query.execute()
        return res.data or []

    @staticmethod
    def create_shift(supabase: Client, payload: ShiftCreate, ctx: RequestContext):
        created = (
            supabase.table("shifts")
            .insert({
                "tenant_id": ctx.tenant_id,
                "name": payload.name,
                "start_time": payload.start_time.isoformat(),
                "end_time": payload.end_time.isoformat(),
                "grace_period_minutes": payload.grace_period_minutes,
                "late_threshold_minutes": payload.late_threshold_minutes,
                "half_day_after_minutes": payload.half_day_after_minutes,
                "description": payload.description,
                "is_active": payload.is_active,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create shift")
        return row

    @staticmethod
    def update_shift(supabase: Client, shift_id: str, payload: ShiftUpdate, ctx: RequestContext):
        update_data = payload.model_dump(exclude_none=True)
        if "start_time" in update_data and update_data["start_time"]:
            update_data["start_time"] = update_data["start_time"].isoformat()
        if "end_time" in update_data and update_data["end_time"]:
            update_data["end_time"] = update_data["end_time"].isoformat()

        updated = (
            supabase.table("shifts")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", shift_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Shift not found")
        return row

    @staticmethod
    def delete_shift(supabase: Client, shift_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("shifts")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", shift_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Shift not found")
        return row

    @staticmethod
    def list_assignments(supabase: Client, ctx: RequestContext, user_id: str | None = None):
        query = (
            supabase.table("user_shift_assignments")
            .select("*, shift:shift_id(*)")
            .eq("tenant_id", ctx.tenant_id)
        )
        if user_id:
            query = query.eq("user_id", user_id)
        if not user_id and ctx.role_key not in ("owner", "admin"):
            query = query.eq("user_id", ctx.app_user_id)
        res = query.execute()
        return res.data or []

    @staticmethod
    def create_assignment(supabase: Client, payload: UserShiftAssignmentCreate, ctx: RequestContext):
        created = (
            supabase.table("user_shift_assignments")
            .insert({
                "tenant_id": ctx.tenant_id,
                "user_id": payload.user_id,
                "shift_id": payload.shift_id,
                "effective_from": payload.effective_from.isoformat() if payload.effective_from else date.today().isoformat(),
                "effective_to": payload.effective_to.isoformat() if payload.effective_to else None,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to assign shift")
        return row

    @staticmethod
    def update_assignment(supabase: Client, assignment_id: str, payload, ctx: RequestContext):
        update_data = payload.model_dump(exclude_none=True)
        if "effective_from" in update_data and update_data["effective_from"]:
            update_data["effective_from"] = update_data["effective_from"].isoformat()
        if "effective_to" in update_data and update_data["effective_to"]:
            update_data["effective_to"] = update_data["effective_to"].isoformat()
        if "effective_to" in update_data and update_data["effective_to"] is None:
            update_data["effective_to"] = None

        updated = (
            supabase.table("user_shift_assignments")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", assignment_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return row

    @staticmethod
    def delete_assignment(supabase: Client, assignment_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("user_shift_assignments")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", assignment_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return row

    @staticmethod
    def get_user_active_shift(supabase: Client, ctx: RequestContext, target_user_id: str | None = None) -> dict | None:
        uid = target_user_id or ctx.app_user_id
        today = date.today()
        res = (
            supabase.table("user_shift_assignments")
            .select("*, shift:shift_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", uid)
            .lte("effective_from", today.isoformat())
            .execute()
        )
        rows = res.data or []
        if not rows:
            return None
        for r in rows:
            if r.get("effective_to") and r["effective_to"] < today.isoformat():
                continue
            return r
        return rows[-1]

    @staticmethod
    def check_in(supabase: Client, payload: AttendanceCheckIn, ctx: RequestContext):
        today = date.today()
        now = datetime.now(timezone.utc)

        existing = (
            supabase.table("attendance_records")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .eq("date", today.isoformat())
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="Already checked in today")

        assignment = AttendanceService.get_user_active_shift(supabase, ctx)
        shift_id = None
        status = "present"
        late_mins = 0

        if assignment and assignment.get("shift"):
            shift = assignment["shift"]
            shift_id = shift["id"]
            start_time = time.fromisoformat(shift["start_time"])
            grace = shift.get("grace_period_minutes", 5)
            late_thresh = shift.get("late_threshold_minutes", 30)
            status, late_mins = _determine_checkin_status(
                now, start_time, grace, late_thresh
            )

        created = (
            supabase.table("attendance_records")
            .insert({
                "tenant_id": ctx.tenant_id,
                "user_id": ctx.app_user_id,
                "date": today.isoformat(),
                "shift_id": shift_id,
                "check_in_time": now.isoformat(),
                "status": status,
                "late_minutes": late_mins if late_mins > 0 else None,
                "check_in_note": payload.note,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to check in")
        return row

    @staticmethod
    def check_out(supabase: Client, payload: AttendanceCheckOut, ctx: RequestContext):
        today = date.today()
        now = datetime.now(timezone.utc)

        res = (
            supabase.table("attendance_records")
            .select("*, shift:shift_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .eq("date", today.isoformat())
            .execute()
        )
        rows = res.data or []
        if not rows:
            raise HTTPException(status_code=404, detail="No check-in record found for today. Please check in first.")
        record = rows[0]
        if record.get("check_out_time"):
            raise HTTPException(status_code=409, detail="Already checked out today")

        check_in_time = datetime.fromisoformat(record["check_in_time"].replace("Z", "+00:00"))
        shift_record = record.get("shift")
        status = record["status"]
        working_mins = None
        overtime_mins = None

        if shift_record:
            start_time = time.fromisoformat(shift_record["start_time"])
            end_time = time.fromisoformat(shift_record["end_time"])
            half_day = shift_record.get("half_day_after_minutes", 240)
            status, working_mins, overtime_mins = _determine_checkout_status(
                check_in_time, now, start_time, end_time, half_day,
            )
            if record.get("late_minutes") and status == "present":
                status = "late"
        else:
            working_mins = int((now - check_in_time).total_seconds() / 60)

        updated = (
            supabase.table("attendance_records")
            .update({
                "check_out_time": now.isoformat(),
                "status": status,
                "working_minutes": working_mins,
                "overtime_minutes": overtime_mins,
                "check_out_note": payload.note,
            })
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", record["id"])
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to check out")
        return row

    @staticmethod
    def list_my_records(
        supabase: Client,
        ctx: RequestContext,
        from_date: str | None = None,
        to_date: str | None = None,
        status_filter: str | None = None,
    ):
        query = (
            supabase.table("attendance_records")
            .select("*, shift:shift_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .order("date", desc=True)
        )
        if from_date:
            query = query.gte("date", from_date)
        if to_date:
            query = query.lte("date", to_date)
        if status_filter:
            query = query.eq("status", status_filter)
        res = query.execute()
        return res.data or []

    @staticmethod
    def list_all_records(
        supabase: Client,
        ctx: RequestContext,
        from_date: str | None = None,
        to_date: str | None = None,
        user_id: str | None = None,
        status_filter: str | None = None,
    ):
        query = (
            supabase.table("attendance_records")
            .select("*, shift:shift_id(*), user:user_id(id, email, full_name, avatar_url)")
            .eq("tenant_id", ctx.tenant_id)
            .order("date", desc=True)
        )
        if from_date:
            query = query.gte("date", from_date)
        if to_date:
            query = query.lte("date", to_date)
        if user_id:
            query = query.eq("user_id", user_id)
        if status_filter:
            query = query.eq("status", status_filter)
        res = query.execute()
        return res.data or []

    @staticmethod
    def update_record(supabase: Client, record_id: str, payload: AttendanceRecordUpdate, ctx: RequestContext):
        update_data = payload.model_dump(exclude_none=True)
        note = update_data.pop("note", None)
        if note:
            update_data["check_in_note"] = note

        update_data["corrected_by"] = ctx.app_user_id

        if "check_in_time" in update_data and update_data["check_in_time"]:
            update_data["check_in_time"] = update_data["check_in_time"].isoformat()
        if "check_out_time" in update_data and update_data["check_out_time"]:
            update_data["check_out_time"] = update_data["check_out_time"].isoformat()

        updated = (
            supabase.table("attendance_records")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", record_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        return row

    @staticmethod
    def delete_record(supabase: Client, record_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("attendance_records")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", record_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        return row

    @staticmethod
    def get_today_status(supabase: Client, ctx: RequestContext):
        today = date.today()
        res = (
            supabase.table("attendance_records")
            .select("*, shift:shift_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .eq("date", today.isoformat())
            .execute()
        )
        records = res.data or []
        return records[0] if records else None

    @staticmethod
    def get_daily_report(supabase: Client, ctx: RequestContext, report_date: str | None = None):
        target_date = report_date or date.today().isoformat()
        res = (
            supabase.table("attendance_records")
            .select("*, shift:shift_id(*), user:user_id(id, email, full_name, avatar_url)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("date", target_date)
            .execute()
        )
        rows = res.data or []

        summary = {
            "total": len(rows),
            "present": sum(1 for r in rows if r["status"] == "present"),
            "late": sum(1 for r in rows if r["status"] == "late"),
            "half_day": sum(1 for r in rows if r["status"] == "half_day"),
            "absent": sum(1 for r in rows if r["status"] == "absent"),
            "overtime": sum(1 for r in rows if r["status"] == "overtime"),
        }

        total_users_res = (
            supabase.table("user_tenant_roles")
            .select("user_id", count="exact")
            .eq("tenant_id", ctx.tenant_id)
            .eq("is_active", True)
            .execute()
        )
        total_users = total_users_res.count if hasattr(total_users_res, "count") else None

        return {"date": target_date, "records": rows, "summary": summary, "total_users": total_users}

    @staticmethod
    def get_summary_report(
        supabase: Client,
        ctx: RequestContext,
        from_date: str | None = None,
        to_date: str | None = None,
        user_id: str | None = None,
    ):
        query = (
            supabase.table("attendance_records")
            .select("*, shift:shift_id(*)")
            .eq("tenant_id", ctx.tenant_id)
        )
        if from_date:
            query = query.gte("date", from_date)
        if to_date:
            query = query.lte("date", to_date)
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        rows = res.data or []

        total_working = sum(r.get("working_minutes") or 0 for r in rows)
        total_late = sum(r.get("late_minutes") or 0 for r in rows)
        total_overtime = sum(r.get("overtime_minutes") or 0 for r in rows)

        return {
            "total_records": len(rows),
            "total_working_hours": round(total_working / 60, 2),
            "total_late_minutes": total_late,
            "total_overtime_hours": round(total_overtime / 60, 2),
            "records": rows,
        }
