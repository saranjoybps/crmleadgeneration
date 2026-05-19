from datetime import date, datetime, timezone

from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.recruitment import (
    CandidateCreate,
    CandidateUpdate,
    CandidateStatusChange,
    InterviewCreate,
    InterviewUpdate,
)


class RecruitmentService:
    @staticmethod
    def list_candidates(
        supabase: Client,
        ctx: RequestContext,
        search: str | None = None,
        status: str | None = None,
        position: str | None = None,
    ):
        query = (
            supabase.table("candidates")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        if status:
            query = query.eq("status", status)
        if position:
            query = query.ilike("position", f"%{position}%")
        if search:
            query = query.or_(
                f"first_name.ilike.%{search}%,"
                f"last_name.ilike.%{search}%,"
                f"email.ilike.%{search}%,"
                f"position.ilike.%{search}%"
            )
        res = query.execute()
        return res.data or []

    @staticmethod
    def create_candidate(supabase: Client, payload: CandidateCreate, ctx: RequestContext):
        created = (
            supabase.table("candidates")
            .insert({
                "tenant_id": ctx.tenant_id,
                "first_name": payload.first_name,
                "last_name": payload.last_name,
                "email": payload.email,
                "phone": payload.phone,
                "position": payload.position,
                "source": payload.source,
                "current_company": payload.current_company,
                "experience_years": payload.experience_years,
                "expected_salary": float(payload.expected_salary) if payload.expected_salary else None,
                "location": payload.location,
                "resume_url": payload.resume_url,
                "notes": payload.notes,
                "created_by": ctx.app_user_id,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create candidate")
        return row

    @staticmethod
    def get_candidate(supabase: Client, candidate_id: str, ctx: RequestContext):
        res = (
            supabase.table("candidates")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", candidate_id)
            .execute()
        )
        row = (res.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return row

    @staticmethod
    def update_candidate(supabase: Client, candidate_id: str, payload: CandidateUpdate, ctx: RequestContext):
        update_data = payload.model_dump(exclude_none=True)
        if "expected_salary" in update_data and update_data["expected_salary"] is not None:
            update_data["expected_salary"] = float(update_data["expected_salary"])

        updated = (
            supabase.table("candidates")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", candidate_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return row

    @staticmethod
    def delete_candidate(supabase: Client, candidate_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("candidates")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", candidate_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return row

    @staticmethod
    def change_status(supabase: Client, candidate_id: str, payload: CandidateStatusChange, ctx: RequestContext):
        candidate = RecruitmentService.get_candidate(supabase, candidate_id, ctx)
        from_status = candidate["status"]
        to_status = payload.status

        updated = (
            supabase.table("candidates")
            .update({"status": to_status})
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", candidate_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to update status")

        supabase.table("candidate_status_log").insert({
            "tenant_id": ctx.tenant_id,
            "candidate_id": candidate_id,
            "from_status": from_status,
            "to_status": to_status,
            "changed_by": ctx.app_user_id,
            "note": payload.note,
        }).execute()

        return row

    @staticmethod
    def get_status_log(supabase: Client, candidate_id: str, ctx: RequestContext):
        res = (
            supabase.table("candidate_status_log")
            .select("*, changed_by_user:changed_by(id, email, full_name)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("candidate_id", candidate_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []

    @staticmethod
    def list_interviews(supabase: Client, candidate_id: str, ctx: RequestContext):
        res = (
            supabase.table("interviews")
            .select("*, interviewer:interviewer_id(id, email, full_name, avatar_url)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("candidate_id", candidate_id)
            .order("scheduled_at", desc=True)
            .execute()
        )
        return res.data or []

    @staticmethod
    def create_interview(supabase: Client, candidate_id: str, payload: InterviewCreate, ctx: RequestContext):
        created = (
            supabase.table("interviews")
            .insert({
                "tenant_id": ctx.tenant_id,
                "candidate_id": candidate_id,
                "interviewer_id": payload.interviewer_id,
                "scheduled_at": payload.scheduled_at.isoformat(),
                "duration_minutes": payload.duration_minutes,
                "interview_type": payload.interview_type,
                "round_number": payload.round_number,
                "notes": payload.notes,
                "created_by": ctx.app_user_id,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to schedule interview")
        return row

    @staticmethod
    def update_interview(supabase: Client, interview_id: str, payload: InterviewUpdate, ctx: RequestContext):
        update_data = payload.model_dump(exclude_none=True)
        if "scheduled_at" in update_data and update_data["scheduled_at"]:
            update_data["scheduled_at"] = update_data["scheduled_at"].isoformat()

        updated = (
            supabase.table("interviews")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", interview_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Interview not found")
        return row

    @staticmethod
    def delete_interview(supabase: Client, interview_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("interviews")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", interview_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Interview not found")
        return row
