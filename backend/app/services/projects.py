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

    @staticmethod
    def _get_accessible_department_ids(supabase: Client, ctx: RequestContext) -> set[str] | None:
        if ctx.role_key in {"owner", "admin"}:
            return None
        rows = (
            supabase.table("user_departments")
            .select("department_id")
            .eq("user_id", ctx.app_user_id)
            .execute()
        )
        return {x["department_id"] for x in (rows.data or [])}

    @staticmethod
    def _get_project_department_map(supabase: Client, tenant_id: str) -> dict[str, list[str]]:
        rows = (
            supabase.table("project_departments")
            .select("project_id,department_id")
            .eq("tenant_id", tenant_id)
            .execute()
        )
        mapping: dict[str, list[str]] = {}
        for row in (rows.data or []):
            mapping.setdefault(row["project_id"], []).append(row["department_id"])
        return mapping

    @classmethod
    def list_projects(cls, supabase: Client, ctx: RequestContext, department_id: str | None = None):
        query = (
            supabase.table("projects")
            .select("id,tenant_id,department_id,name,description,status,created_by,created_at,updated_at")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        rows = query.execute().data or []
        project_department_map = cls._get_project_department_map(supabase, ctx.tenant_id)
        for row in rows:
            fallback = [row["department_id"]] if row.get("department_id") else []
            row["department_ids"] = project_department_map.get(row["id"], fallback)
        
        allowed_department_ids = cls._get_accessible_department_ids(supabase, ctx)
        if allowed_department_ids is not None:
            rows = [row for row in rows if set(row.get("department_ids", [])).intersection(allowed_department_ids)]
        if department_id:
            rows = [row for row in rows if department_id in row.get("department_ids", [])]
        
        return rows

    @classmethod
    def get_project(cls, supabase: Client, project_id: str, ctx: RequestContext):
        data = (
            supabase.table("projects")
            .select("id,tenant_id,department_id,name,description,status,created_by,created_at,updated_at")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", project_id)
            .maybe_single()
            .execute()
        )
        if not data.data:
            raise HTTPException(status_code=404, detail="Project not found")
        project_department_map = cls._get_project_department_map(supabase, ctx.tenant_id)
        fallback = [data.data["department_id"]] if data.data.get("department_id") else []
        data.data["department_ids"] = project_department_map.get(data.data["id"], fallback)
        
        allowed_department_ids = cls._get_accessible_department_ids(supabase, ctx)
        if allowed_department_ids is not None and not set(data.data.get("department_ids", [])).intersection(allowed_department_ids):
            raise HTTPException(status_code=404, detail="Project not found")
        
        return data.data

    @classmethod
    def create_project(cls, supabase: Client, payload: ProjectCreate, ctx: RequestContext):
        department_ids = [x for x in (payload.department_ids or []) if x]
        if not department_ids:
            legacy_department = payload.department_id or ctx.department_id
            if legacy_department:
                department_ids = [legacy_department]
        if not department_ids:
            raise HTTPException(status_code=400, detail="department_ids is required")
        if ctx.role_key not in {"owner", "admin"}:
            allowed_department_ids = cls._get_accessible_department_ids(supabase, ctx) or set()
            if not set(department_ids).issubset(allowed_department_ids):
                raise HTTPException(status_code=403, detail="Forbidden for this department")

        body = {
            "tenant_id": ctx.tenant_id,
            "department_id": department_ids[0],
            "name": payload.name,
            "description": payload.description,
            "status": payload.status or "active",
            "created_by": ctx.app_user_id,
        }
        created = supabase.table("projects").insert(body).execute()
        project = (created.data or [None])[0]
        if not project:
            raise HTTPException(status_code=500, detail="Failed to create project")
        supabase.table("project_departments").upsert(
            [
                {"tenant_id": ctx.tenant_id, "project_id": project["id"], "department_id": dept_id}
                for dept_id in dict.fromkeys(department_ids)
            ],
            on_conflict="project_id,department_id",
        ).execute()
        project["department_ids"] = list(dict.fromkeys(department_ids))

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

    @classmethod
    def update_project(cls, supabase: Client, project_id: str, payload: ProjectUpdate, ctx: RequestContext):
        next_department_ids = payload.department_ids
        if next_department_ids is None and payload.department_id is not None:
            next_department_ids = [payload.department_id]

        if next_department_ids is not None and len(next_department_ids) == 0:
            raise HTTPException(status_code=400, detail="department_ids cannot be empty")
        if next_department_ids is not None and ctx.role_key not in {"owner", "admin"}:
            allowed_department_ids = cls._get_accessible_department_ids(supabase, ctx) or set()
            if not set(next_department_ids).issubset(allowed_department_ids):
                raise HTTPException(status_code=403, detail="Forbidden for this department")
        update_payload = payload.model_dump(exclude_none=True, exclude={"department_ids"})
        if next_department_ids is not None:
            update_payload["department_id"] = next_department_ids[0]
        updated = (
            supabase.table("projects")
            .update(update_payload)
            .eq("id", project_id)
            .eq("tenant_id", ctx.tenant_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        if next_department_ids is not None:
            deduped_ids = list(dict.fromkeys(next_department_ids))
            supabase.table("project_departments").delete().eq("tenant_id", ctx.tenant_id).eq("project_id", project_id).execute()
            supabase.table("project_departments").insert(
                [{"tenant_id": ctx.tenant_id, "project_id": project_id, "department_id": dept_id} for dept_id in deduped_ids]
            ).execute()
            row["department_ids"] = deduped_ids
        else:
            row["department_ids"] = cls._get_project_department_map(supabase, ctx.tenant_id).get(
                project_id,
                [row["department_id"]] if row.get("department_id") else [],
            )
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
