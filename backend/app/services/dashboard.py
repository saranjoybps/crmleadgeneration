from supabase import Client
from app.core.deps import RequestContext

class DashboardService:
    @staticmethod
    def get_summary(supabase: Client, ctx: RequestContext):
        # This is a bit inefficient to do separate calls, 
        # but for now it's okay. In a real app we might use a view or specialized RPC.
        
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
        
        return {
            "active_projects": projects_count or 0,
            "open_tickets": tickets_count or 0,
            "pending_tasks": tasks_count or 0,
            "team_members": users_count or 0,
        }
