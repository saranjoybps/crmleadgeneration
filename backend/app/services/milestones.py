from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import MilestoneCreate, MilestoneUpdate


class MilestoneService:
    @staticmethod
    def _get_accessible_department_ids(supabase: Client, ctx: RequestContext) -> set[str] | None:
        if ctx.role_key in {"owner", "admin"}:
            return None
        rows = (
            supabase.table("user_department_roles")
            .select("department_id")
            .eq("user_id", ctx.app_user_id)
            .eq("is_active", True)
            .execute()
        )
        return {x["department_id"] for x in (rows.data or [])}

    @classmethod
    def list_milestones(cls, supabase: Client, ctx: RequestContext, project_id: str | None = None):
        query = (
            supabase.table("milestones")
            .select("*, projects(department_id)")
            .eq("tenant_id", ctx.tenant_id)
        )
        if project_id:
            query = query.eq("project_id", project_id)
        
        rows = query.order("due_date", desc=False).execute().data or []
        
        # Apply department-based filtering for non-admin users
        allowed_department_ids = cls._get_accessible_department_ids(supabase, ctx)
        if allowed_department_ids is not None:
            rows = [row for row in rows if row.get("projects", {}).get("department_id") in allowed_department_ids]
        
        return rows

    @classmethod
    def get_milestone(cls, supabase: Client, milestone_id: str, ctx: RequestContext):
        data = (
            supabase.table("milestones")
            .select("*, projects(department_id)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", milestone_id)
            .maybe_single()
            .execute()
        )
        if not data.data:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        # Check department access for non-admin users
        allowed_department_ids = cls._get_accessible_department_ids(supabase, ctx)
        if allowed_department_ids is not None and data.data.get("projects", {}).get("department_id") not in allowed_department_ids:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        return data.data

    @staticmethod
    def create_milestone(supabase: Client, payload: MilestoneCreate, ctx: RequestContext):
        body = {
            "tenant_id": ctx.tenant_id,
            "project_id": payload.project_id,
            "name": payload.name,
            "description": payload.description,
            "due_date": payload.due_date,
            "status": payload.status or "pending",
            "created_by": ctx.app_user_id,
        }
        created = supabase.table("milestones").insert(body).execute()
        milestone = (created.data or [None])[0]
        if not milestone:
            raise HTTPException(status_code=500, detail="Failed to create milestone")
        return milestone

    @staticmethod
    def update_milestone(supabase: Client, milestone_id: str, payload: MilestoneUpdate, ctx: RequestContext):
        updated = (
            supabase.table("milestones")
            .update(payload.model_dump(exclude_none=True))
            .eq("id", milestone_id)
            .eq("tenant_id", ctx.tenant_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return row

    @staticmethod
    def delete_milestone(supabase: Client, milestone_id: str, ctx: RequestContext):
        resp = (
            supabase.table("milestones")
            .delete()
            .eq("id", milestone_id)
            .eq("tenant_id", ctx.tenant_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return {"status": "success"}
