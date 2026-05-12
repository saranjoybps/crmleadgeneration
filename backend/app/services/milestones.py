from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import MilestoneCreate, MilestoneUpdate


class MilestoneService:
    @classmethod
    def list_milestones(cls, supabase: Client, ctx: RequestContext, project_id: str | None = None):
        query = (
            supabase.table("milestones")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
        )
        if project_id:
            query = query.eq("project_id", project_id)
        
        return query.order("due_date", desc=False).execute().data or []

    @classmethod
    def get_milestone(cls, supabase: Client, milestone_id: str, ctx: RequestContext):
        data = (
            supabase.table("milestones")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", milestone_id)
            .maybe_single()
            .execute()
        )
        if not data.data:
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
