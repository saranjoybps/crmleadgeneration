from supabase import Client
from postgrest.exceptions import APIError
from app.core.deps import RequestContext
from app.services.access_scope import AccessScopeService

class DashboardService:
    @staticmethod
    def get_summary(supabase: Client, ctx: RequestContext):
        # This is a bit inefficient to do separate calls, 
        # but for now it's okay. In a real app we might use a view or specialized RPC.
        
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)

        if allowed_project_ids is not None:
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
