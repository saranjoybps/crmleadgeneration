from supabase import Client
from postgrest.exceptions import APIError
from fastapi import HTTPException
from app.core.deps import RequestContext

class DashboardService:
    @staticmethod
    def _get_accessible_department_ids(supabase: Client, ctx: RequestContext) -> set[str] | None:
        if ctx.role_key in {"owner", "admin", "client"}:
            return None
        rows = (
            supabase.table("user_departments")
            .select("department_id")
            .eq("user_id", ctx.app_user_id)
            .execute()
        )
        return {x["department_id"] for x in (rows.data or [])}

    @staticmethod
    def _get_project_department_map(supabase: Client, tenant_id: str) -> dict[str, set[str]]:
        rows = (
            supabase.table("project_departments")
            .select("project_id,department_id")
            .eq("tenant_id", tenant_id)
            .execute()
        )
        mapping: dict[str, set[str]] = {}
        for row in (rows.data or []):
            mapping.setdefault(row["project_id"], set()).add(row["department_id"])
        return mapping

    @staticmethod
    def get_summary(supabase: Client, ctx: RequestContext):
        # This is a bit inefficient to do separate calls, 
        # but for now it's okay. In a real app we might use a view or specialized RPC.
        
        allowed_department_ids = DashboardService._get_accessible_department_ids(supabase, ctx)
        
        if allowed_department_ids is not None:
            project_rows = (
                supabase.table("projects")
                .select("id,department_id")
                .eq("tenant_id", ctx.tenant_id)
                .execute()
                .data or []
            )
            project_department_map = DashboardService._get_project_department_map(supabase, ctx.tenant_id)
            allowed_project_ids = {
                p["id"]
                for p in project_rows
                if (
                    project_department_map.get(p["id"], {p["department_id"]} if p.get("department_id") else set())
                ).intersection(allowed_department_ids)
            }
            projects_count = len(allowed_project_ids)
            tickets_count = (
                supabase.table("tickets")
                .select("id", count="exact")
                .eq("tenant_id", ctx.tenant_id)
                .eq("status", "open")
                .in_("project_id", list(allowed_project_ids) or ["00000000-0000-0000-0000-000000000000"])
                .execute()
                .count
            )
            tasks_count = (
                supabase.table("tasks")
                .select("id", count="exact")
                .eq("tenant_id", ctx.tenant_id)
                .not_.eq("status", "closed")
                .in_("project_id", list(allowed_project_ids) or ["00000000-0000-0000-0000-000000000000"])
                .execute()
                .count
            )
        else:
            # Admin/owner sees all
            projects_count = (
                supabase.table("projects")
                .select("id", count="exact")
                .eq("tenant_id", ctx.tenant_id)
                .execute()
                .count
            )
            
            tickets_count = (
                supabase.table("tickets")
                .select("id", count="exact")
                .eq("tenant_id", ctx.tenant_id)
                .eq("status", "open")
                .execute()
                .count
            )
            
            tasks_count = (
                supabase.table("tasks")
                .select("id", count="exact")
                .eq("tenant_id", ctx.tenant_id)
                .not_.eq("status", "closed")
                .execute()
                .count
            )
        
        users_count = (
            supabase.table("user_tenant_roles")
            .select("id", count="exact")
            .eq("tenant_id", ctx.tenant_id)
            .eq("is_active", True)
            .execute()
            .count
        )

        todos_count = (
            supabase.table("todos")
            .select("id", count="exact")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .eq("is_completed", False)
            .execute()
            .count
        )

        try:
            total_minutes = (
                supabase.table("time_entries")
                .select("duration_minutes")
                .eq("tenant_id", ctx.tenant_id)
                .execute()
            )
            logged_hours = sum(r["duration_minutes"] for r in (total_minutes.data or [])) / 60
        except APIError:
            logged_hours = 0
        
        return {
            "active_projects": projects_count or 0,
            "open_tickets": tickets_count or 0,
            "pending_tasks": tasks_count or 0,
            "team_members": users_count or 0,
            "pending_todos": todos_count or 0,
            "analytics": {
                "total_logged_hours": round(logged_hours, 1),
            }
        }
