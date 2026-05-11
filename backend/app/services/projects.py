from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import ProjectCreate, ProjectMemberCreate, ProjectUpdate


class ProjectService:
    @staticmethod
    def _get_accessible_project_ids(supabase: Client, ctx: RequestContext) -> set[str] | None:
        if ctx.role_key in {"owner", "admin"}:
            return None
        rows = (
            supabase.table("project_members")
            .select("project_id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .eq("is_active", True)
            .execute()
        )
        return {x["project_id"] for x in (rows.data or [])}

    @classmethod
    def list_projects(cls, supabase: Client, ctx: RequestContext):
        query = (
            supabase.table("projects")
            .select("id,tenant_id,name,description,status,created_by,created_at,updated_at")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        rows = query.execute().data or []
        allowed_ids = cls._get_accessible_project_ids(supabase, ctx)
        if allowed_ids is not None:
            rows = [row for row in rows if row["id"] in allowed_ids]
        return rows

    @classmethod
    def get_project(cls, supabase: Client, project_id: str, ctx: RequestContext):
        data = (
            supabase.table("projects")
            .select("id,tenant_id,name,description,status,created_by,created_at,updated_at")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", project_id)
            .maybe_single()
            .execute()
        )
        if not data.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        allowed_ids = cls._get_accessible_project_ids(supabase, ctx)
        if allowed_ids is not None and project_id not in allowed_ids:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return data.data

    @staticmethod
    def create_project(supabase: Client, payload: ProjectCreate, ctx: RequestContext):
        body = {
            "tenant_id": ctx.tenant_id,
            "name": payload.name,
            "description": payload.description,
            "status": payload.status or "active",
            "created_by": ctx.app_user_id,
        }
        created = supabase.table("projects").insert(body).execute()
        project = (created.data or [None])[0]
        if not project:
            raise HTTPException(status_code=500, detail="Failed to create project")

        member_ids = set(payload.member_user_ids or [])
        if member_ids:
            members_to_insert = [
                {
                    "tenant_id": ctx.tenant_id,
                    "project_id": project["id"],
                    "user_id": user_id,
                    "is_active": True,
                    "created_by": ctx.app_user_id,
                }
                for user_id in member_ids
            ]
            supabase.table("project_members").upsert(
                members_to_insert,
                on_conflict="project_id,user_id",
            ).execute()
        
        return project

    @staticmethod
    def update_project(supabase: Client, project_id: str, payload: ProjectUpdate, ctx: RequestContext):
        updated = (
            supabase.table("projects")
            .update(payload.model_dump(exclude_none=True))
            .eq("id", project_id)
            .eq("tenant_id", ctx.tenant_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return row

    @staticmethod
    def delete_project(supabase: Client, project_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("projects")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", project_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return row

    @staticmethod
    def add_project_member(supabase: Client, project_id: str, payload: ProjectMemberCreate, ctx: RequestContext):
        row = (
            supabase.table("project_members")
            .upsert(
                {
                    "tenant_id": ctx.tenant_id,
                    "project_id": project_id,
                    "user_id": payload.user_id,
                    "is_active": True,
                    "created_by": ctx.app_user_id,
                },
                on_conflict="project_id,user_id",
            )
            .execute()
        )
        return (row.data or [None])[0]

    @classmethod
    def list_project_members(cls, supabase: Client, project_id: str, ctx: RequestContext):
        allowed_ids = cls._get_accessible_project_ids(supabase, ctx)
        if allowed_ids is not None and project_id not in allowed_ids:
            raise HTTPException(status_code=404, detail="Project not found")
        
        rows = (
            supabase.table("project_members")
            .select("id,project_id,user_id,is_active,created_at,updated_at,users(email,full_name)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("project_id", project_id)
            .eq("is_active", True)
            .execute()
        )
        return rows.data or []

    @staticmethod
    def remove_project_member(supabase: Client, project_id: str, user_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("project_members")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("project_id", project_id)
            .eq("user_id", user_id)
            .execute()
        )
        return (deleted.data or [None])[0]
