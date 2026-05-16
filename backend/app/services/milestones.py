from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import MilestoneCreate, MilestoneUpdate
from app.services.access_scope import AccessScopeService


class MilestoneService:
    @classmethod
    def list_milestones(
        cls,
        supabase: Client,
        ctx: RequestContext,
        project_id: str | None = None,
        department_id: str | None = None,
    ):
        query = (
            supabase.table("milestones")
            .select("*, projects(department_id)")
            .eq("tenant_id", ctx.tenant_id)
        )
        if project_id:
            query = query.eq("project_id", project_id)
        
        rows = query.order("due_date", desc=False).execute().data or []
        
        project_department_map = AccessScopeService.get_project_department_map(supabase, ctx.tenant_id)
        for row in rows:
            fallback = {row.get("projects", {}).get("department_id")} if row.get("projects", {}).get("department_id") else set()
            row["_project_department_ids"] = project_department_map.get(row["project_id"], fallback)
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None:
            rows = [row for row in rows if row["project_id"] in allowed_project_ids]
        if department_id:
            rows = [row for row in rows if department_id in row.get("_project_department_ids", set())]
        for row in rows:
            row.pop("_project_department_ids", None)

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
        
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None and data.data["project_id"] not in allowed_project_ids:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        return data.data

    @staticmethod
    def create_milestone(supabase: Client, payload: MilestoneCreate, ctx: RequestContext):
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None and payload.project_id not in allowed_project_ids:
            raise HTTPException(status_code=403, detail="Forbidden for this project")
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
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None:
            milestone = (
                supabase.table("milestones")
                .select("id,project_id")
                .eq("tenant_id", ctx.tenant_id)
                .eq("id", milestone_id)
                .maybe_single()
                .execute()
            )
            if not milestone.data:
                raise HTTPException(status_code=404, detail="Milestone not found")
            if milestone.data["project_id"] not in allowed_project_ids:
                raise HTTPException(status_code=403, detail="Forbidden for this project")
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
