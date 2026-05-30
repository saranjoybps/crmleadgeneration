from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.leave import (
    LeaveRequestApprove,
    LeaveRequestCancel,
    LeaveRequestCreate,
    LeaveRequestReject,
    LeaveTypeCreate,
    LeaveTypeUpdate,
)


def _calculate_duration(start: date, end: date) -> int:
    return (end - start).days + 1


class LeaveService:

    # ---- Leave Types ----

    @staticmethod
    def list_leave_types(supabase: Client, ctx: RequestContext, active_only: bool = False):
        query = (
            supabase.table("leave_types")
            .select("*")
            .or_("tenant_id.is.null,tenant_id.eq." + ctx.tenant_id)
            .order("sort_order")
            .order("name")
        )
        if active_only:
            query = query.eq("is_active", True)
        res = query.execute()
        return res.data or []

    @staticmethod
    def create_leave_type(supabase: Client, payload: LeaveTypeCreate, ctx: RequestContext):
        created = (
            supabase.table("leave_types")
            .insert({
                "tenant_id": ctx.tenant_id,
                "name": payload.name,
                "description": payload.description,
                "days_per_year": str(payload.days_per_year),
                "requires_approval": payload.requires_approval,
                "is_active": payload.is_active,
                "sort_order": payload.sort_order,
                "color": payload.color,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create leave type")
        return row

    @staticmethod
    def update_leave_type(supabase: Client, leave_type_id: str, payload: LeaveTypeUpdate, ctx: RequestContext):
        update_data = payload.model_dump(exclude_unset=True)
        if "days_per_year" in update_data and update_data["days_per_year"] is not None:
            update_data["days_per_year"] = str(update_data["days_per_year"])

        updated = (
            supabase.table("leave_types")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", leave_type_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Leave type not found")
        return row

    @staticmethod
    def delete_leave_type(supabase: Client, leave_type_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("leave_types")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", leave_type_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Leave type not found")
        return row

    # ---- Leave Balances ----

    @staticmethod
    def _ensure_balance(supabase: Client, ctx: RequestContext, user_id: str, leave_type_id: str, year: int):
        existing = (
            supabase.table("leave_balances")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", user_id)
            .eq("leave_type_id", leave_type_id)
            .eq("year", year)
            .execute()
        )
        if existing.data:
            return existing.data[0]

        lt_res = (
            supabase.table("leave_types")
            .select("days_per_year")
            .eq("id", leave_type_id)
            .or_("tenant_id.is.null,tenant_id.eq." + ctx.tenant_id)
            .order("tenant_id", desc=True)
            .limit(1)
            .execute()
        )
        lt = (lt_res.data or [None])[0]
        if not lt:
            return None

        created = (
            supabase.table("leave_balances")
            .insert({
                "tenant_id": ctx.tenant_id,
                "user_id": user_id,
                "leave_type_id": leave_type_id,
                "year": year,
                "total_days": lt["days_per_year"],
                "used_days": 0,
                "pending_days": 0,
            })
            .execute()
        )
        return (created.data or [None])[0]

    @staticmethod
    def get_my_balances(supabase: Client, ctx: RequestContext, year: int | None = None):
        target_year = year or date.today().year

        leave_types = LeaveService.list_leave_types(supabase, ctx, active_only=True)

        balances = []
        for lt in leave_types:
            bal = LeaveService._ensure_balance(supabase, ctx, ctx.app_user_id, lt["id"], target_year)
            if bal:
                total = float(bal["total_days"])
                used = float(bal["used_days"])
                pending = float(bal["pending_days"])
                balances.append({
                    "leave_type_id": lt["id"],
                    "leave_type": lt,
                    "year": target_year,
                    "total_days": total,
                    "used_days": used,
                    "pending_days": pending,
                    "available_days": round(total - used - pending, 1),
                })

        return balances

    @staticmethod
    def get_all_balances(supabase: Client, ctx: RequestContext, year: int | None = None):
        target_year = year or date.today().year

        users_res = (
            supabase.table("user_tenant_roles")
            .select("user_id, users!inner(id, email, full_name, avatar_url)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("is_active", True)
            .execute()
        )
        members = users_res.data or []

        leave_types = LeaveService.list_leave_types(supabase, ctx, active_only=True)

        results = []
        for member in members:
            user = member.get("users") or {}
            row = {"user_id": user.get("id"), "email": user.get("email"), "full_name": user.get("full_name")}
            balances_list = []
            for lt in leave_types:
                bal = LeaveService._ensure_balance(supabase, ctx, user["id"], lt["id"], target_year)
                if bal:
                    total = float(bal["total_days"])
                    used = float(bal["used_days"])
                    pending = float(bal["pending_days"])
                    balances_list.append({
                        "leave_type_id": lt["id"],
                        "leave_type": lt,
                        "year": target_year,
                        "total_days": total,
                        "used_days": used,
                        "pending_days": pending,
                        "available_days": round(total - used - pending, 1),
                    })
            row["balances"] = balances_list
            results.append(row)

        return {"year": target_year, "leave_types": leave_types, "members": results}

    # ---- Leave Requests ----

    @staticmethod
    def create_request(supabase: Client, payload: LeaveRequestCreate, ctx: RequestContext):
        if payload.end_date < payload.start_date:
            raise HTTPException(status_code=400, detail="End date cannot be before start date")

        duration = _calculate_duration(payload.start_date, payload.end_date)
        if payload.half_day and duration > 1:
            raise HTTPException(status_code=400, detail="Half-day leave cannot span multiple days")

        if payload.half_day and payload.half_day_period not in ("morning", "afternoon"):
            raise HTTPException(status_code=400, detail="Half-day period must be 'morning' or 'afternoon'")

        duration_days = 0.5 if payload.half_day else float(duration)

        overlapping = (
            supabase.table("leave_requests")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .in_("status", ["pending", "approved"])
            .lte("start_date", payload.end_date.isoformat())
            .gte("end_date", payload.start_date.isoformat())
            .execute()
        )
        if overlapping.data:
            raise HTTPException(status_code=409, detail="You already have a pending or approved leave request overlapping these dates")

        lt_res = (
            supabase.table("leave_types")
            .select("*")
            .eq("id", payload.leave_type_id)
            .or_("tenant_id.is.null,tenant_id.eq." + ctx.tenant_id)
            .order("tenant_id", desc=True)
            .limit(1)
            .execute()
        )
        lt = (lt_res.data or [None])[0]
        if not lt:
            raise HTTPException(status_code=404, detail="Leave type not found")

        year = payload.start_date.year
        bal = LeaveService._ensure_balance(supabase, ctx, ctx.app_user_id, payload.leave_type_id, year)
        if not bal:
            raise HTTPException(status_code=500, detail="Failed to get leave balance")

        available = float(bal["total_days"]) - float(bal["used_days"]) - float(bal["pending_days"])
        if duration_days > available:
            raise HTTPException(status_code=400, detail=f"Insufficient leave balance. Available: {available} days, Requested: {duration_days} days")

        created = (
            supabase.table("leave_requests")
            .insert({
                "tenant_id": ctx.tenant_id,
                "user_id": ctx.app_user_id,
                "leave_type_id": payload.leave_type_id,
                "start_date": payload.start_date.isoformat(),
                "end_date": payload.end_date.isoformat(),
                "duration_days": duration_days,
                "half_day": payload.half_day,
                "half_day_period": payload.half_day_period if payload.half_day else None,
                "reason": payload.reason,
                "status": "pending",
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create leave request")

        supabase.rpc("update_leave_balance", {
            "p_balance_id": bal["id"],
            "p_pending_delta": duration_days,
        }).execute()

        return row

    @staticmethod
    def list_my_requests(
        supabase: Client,
        ctx: RequestContext,
        status: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ):
        query = (
            supabase.table("leave_requests")
            .select("*, leave_type:leave_type_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .order("created_at", desc=True)
        )
        if status:
            query = query.eq("status", status)
        if from_date:
            query = query.gte("start_date", from_date)
        if to_date:
            query = query.lte("end_date", to_date)
        res = query.execute()
        return res.data or []

    @staticmethod
    def list_all_requests(
        supabase: Client,
        ctx: RequestContext,
        status: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        user_id: str | None = None,
    ):
        query = (
            supabase.table("leave_requests")
            .select("*, leave_type:leave_type_id(*), user:user_id(id, email, full_name, avatar_url)")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        if status:
            query = query.eq("status", status)
        if from_date:
            query = query.gte("start_date", from_date)
        if to_date:
            query = query.lte("end_date", to_date)
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        return res.data or []

    @staticmethod
    def get_request(supabase: Client, request_id: str, ctx: RequestContext):
        res = (
            supabase.table("leave_requests")
            .select("*, leave_type:leave_type_id(*), user:user_id(id, email, full_name, avatar_url)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", request_id)
            .execute()
        )
        row = (res.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Leave request not found")
        return row

    @staticmethod
    def cancel_request(supabase: Client, request_id: str, payload: LeaveRequestCancel, ctx: RequestContext):
        res = (
            supabase.table("leave_requests")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", request_id)
            .execute()
        )
        row = (res.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Leave request not found")

        if row["user_id"] != ctx.app_user_id and ctx.role_key not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="You can only cancel your own leave requests")

        if row["status"] != "pending":
            raise HTTPException(status_code=400, detail="Only pending requests can be cancelled")

        updated = (
            supabase.table("leave_requests")
            .update({"status": "cancelled"})
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", request_id)
            .execute()
        )
        updated_row = (updated.data or [None])[0]
        if not updated_row:
            raise HTTPException(status_code=500, detail="Failed to cancel leave request")

        # Revert pending days
        bal_res = (
            supabase.table("leave_balances")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", row["user_id"])
            .eq("leave_type_id", row["leave_type_id"])
            .eq("year", row["start_date"].year if hasattr(row["start_date"], "year") else date.fromisoformat(str(row["start_date"])).year)
            .execute()
        )
        if bal_res.data:
            bal = bal_res.data[0]
            new_pending = max(0, float(bal["pending_days"]) - float(row["duration_days"]))
            supabase.table("leave_balances").update({"pending_days": new_pending}).eq("id", bal["id"]).execute()

        return updated_row

    @staticmethod
    def approve_request(supabase: Client, request_id: str, payload: LeaveRequestApprove, ctx: RequestContext):
        res = (
            supabase.table("leave_requests")
            .select("*, leave_type:leave_type_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", request_id)
            .execute()
        )
        row = (res.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Leave request not found")
        if row["status"] != "pending":
            raise HTTPException(status_code=400, detail="Only pending requests can be approved")

        now = datetime.now(timezone.utc)
        updated = (
            supabase.table("leave_requests")
            .update({
                "status": "approved",
                "approved_by": ctx.app_user_id,
                "approved_at": now.isoformat(),
            })
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", request_id)
            .execute()
        )
        updated_row = (updated.data or [None])[0]
        if not updated_row:
            raise HTTPException(status_code=500, detail="Failed to approve leave request")

        # Update balance: move pending_days -> used_days
        start_date = row["start_date"] if isinstance(row["start_date"], date) else date.fromisoformat(str(row["start_date"]))
        bal_res = (
            supabase.table("leave_balances")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", row["user_id"])
            .eq("leave_type_id", row["leave_type_id"])
            .eq("year", start_date.year)
            .execute()
        )
        if bal_res.data:
            bal = bal_res.data[0]
            duration = float(row["duration_days"])
            new_pending = max(0, float(bal["pending_days"]) - duration)
            new_used = float(bal["used_days"]) + duration
            supabase.table("leave_balances").update({
                "pending_days": new_pending,
                "used_days": new_used,
            }).eq("id", bal["id"]).execute()

        # Create attendance records with on_leave status
        lt_name = row.get("leave_type", {}).get("name", "Leave")
        current = start_date
        end_date = row["end_date"] if isinstance(row["end_date"], date) else date.fromisoformat(str(row["end_date"]))
        while current <= end_date:
            supabase.table("attendance_records").upsert({
                "tenant_id": ctx.tenant_id,
                "user_id": row["user_id"],
                "date": current.isoformat(),
                "status": "on_leave",
                "check_in_note": f"On leave: {lt_name}",
            }, on_conflict="tenant_id,user_id,date").execute()
            current += timedelta(days=1)

        return updated_row

    @staticmethod
    def reject_request(supabase: Client, request_id: str, payload: LeaveRequestReject, ctx: RequestContext):
        res = (
            supabase.table("leave_requests")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", request_id)
            .execute()
        )
        row = (res.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Leave request not found")
        if row["status"] != "pending":
            raise HTTPException(status_code=400, detail="Only pending requests can be rejected")

        updated = (
            supabase.table("leave_requests")
            .update({
                "status": "rejected",
                "approved_by": ctx.app_user_id,
                "rejection_reason": payload.rejection_reason,
            })
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", request_id)
            .execute()
        )
        updated_row = (updated.data or [None])[0]
        if not updated_row:
            raise HTTPException(status_code=500, detail="Failed to reject leave request")

        # Revert pending days
        start_date = row["start_date"] if isinstance(row["start_date"], date) else date.fromisoformat(str(row["start_date"]))
        bal_res = (
            supabase.table("leave_balances")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", row["user_id"])
            .eq("leave_type_id", row["leave_type_id"])
            .eq("year", start_date.year)
            .execute()
        )
        if bal_res.data:
            bal = bal_res.data[0]
            new_pending = max(0, float(bal["pending_days"]) - float(row["duration_days"]))
            supabase.table("leave_balances").update({"pending_days": new_pending}).eq("id", bal["id"]).execute()

        return updated_row
