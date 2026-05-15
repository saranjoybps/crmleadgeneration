from supabase import Client
from postgrest.exceptions import APIError
from fastapi import HTTPException
from app.core.deps import RequestContext

class DashboardService:
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
    def get_summary(supabase: Client, ctx: RequestContext):
        # This is a bit inefficient to do separate calls, 
        # but for now it's okay. In a real app we might use a view or specialized RPC.
        
        allowed_department_ids = DashboardService._get_accessible_department_ids(supabase, ctx)
        
        if allowed_department_ids is not None:
            # Filter projects by department for non-admin users
            projects_count = (
                supabase.table("projects")
                .select("id", count="exact")
                .eq("tenant_id", ctx.tenant_id)
                .in_("department_id", list(allowed_department_ids))
                .execute()
                .count
            )
            
            # Filter tickets by project department for non-admin users
            tickets_count = (
                supabase.table("tickets")
                .select("id", count="exact")
                .eq("tenant_id", ctx.tenant_id)
                .eq("status", "open")
                .execute()
            )
            # Filter tickets based on project department
            if tickets_count > 0:
                ticket_rows = (
                    supabase.table("tickets")
                    .select("id, projects(department_id)")
                    .eq("tenant_id", ctx.tenant_id)
                    .eq("status", "open")
                    .execute()
                    .data or []
                )
                tickets_count = len([t for t in ticket_rows if t.get("projects", {}).get("department_id") in allowed_department_ids])
            
            # Filter tasks by department for non-admin users
            tasks_count = (
                supabase.table("tasks")
                .select("id", count="exact")
                .eq("tenant_id", ctx.tenant_id)
                .not_.eq("status", "closed")
                .in_("department_id", list(allowed_department_ids))
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
